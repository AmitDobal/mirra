# AI cost controls + spoken coach cues

## Goals

- **Meter every paid AI call** (`ai_usage_events` + `ai_usage_daily`). One path: `logAiUsage` → `recordUsage`.
- **Plan-tier quotas** (free vs pro) enforced server-side before any paid call.
- **Heuristic first** for plan chat. Chips ("no dairy", "no cable machines") never touch the LLM.
- **Cache TTS** (D1 `voice_cue_cache` + R2). Same voice + text = $0.
- **No chat TTS.** Voice is one short Today cue built from existing data, not LLM output.
- **Degrade, don't break.** Over budget → heuristic result, not an error (except voice, which 429s).

## Tables

| Table | Purpose | Key |
| --- | --- | --- |
| `ai_usage_events` | One row per call: feature, provider, model, tokens, `estimated_micros` (USD micros), `meta_json` | `id`; idx `(user_id, created_at)`, `(user_id, feature, created_at)` |
| `ai_usage_daily` | Rollup for quota checks (PK lookups, no scans) | `(user_id, day, feature)` → calls, tokens, micros |
| `voice_cue_cache` | TTS cache index | `cache_key = sha256(voiceId\|text)` → `r2_key`, text, voice_id, bytes |

R2 convention: `voice-cues/{cache_key}.mp3` in the `MEDIA` bucket. No R2 binding = bytes returned once, never stored.
Features: `revise | coach | meal_plan | meal_estimate | plan_gen | voice_tts`. Day = UTC date.

## Quotas (`lib/ai-quotas.ts`)

| | Free | Pro |
| --- | --- | --- |
| Monthly tokens (all LLM features) | 80,000 | 500,000 |
| `revise` LLM / day | 8 | 40 |
| `coach` LLM / day | 15 | 60 |
| `meal_plan` LLM / day | 5 | 20 |
| `voice_tts` / day | 3 | 15 |

`meal_estimate` and `plan_gen` have no daily cap; the monthly token budget bounds them.
Tier: `entitlements.status` in `active | trial | grace` and not expired → pro, else free.
Heuristic calls are not recorded and never count against LLM caps.

## Flows

**Plan chat revise** (`getPlanReviser`): heuristic rules always run first. LLM only if rules found no intent AND message ≥ 12 chars AND `assertCanSpend(revise)` passes. Otherwise the heuristic result returns (with a soft warning when capped). LLM failure → heuristic.

**Coach / meal plan / meal estimate / plan gen**: adapter calls `canSpend` first. Over cap or over monthly budget → heuristic adapter. The request never fails.

**Today voice cue**: Today gains focus → mobile checks `voice_cue_played_YYYY-MM-DD` → if unset, `GET /v1/voice/cue/today` → server `assertCanSpend(voice_tts)` (429 when spent) → cue text from today actions (≤ 180 chars, no LLM) → `SpeechSynthesizer` (cache → ElevenLabs) → record usage → mobile plays audio once, stores the day key. No key = text only, mobile skips playback.

## APIs

| Route | Response |
| --- | --- |
| `GET /v1/ai/usage` | `{ tier, monthTokensUsed, monthTokensLimit, features: { revise, coach, voice, mealPlan: { used, limit } } }` |
| `GET /v1/voice/cue/today` | `{ text, audioBase64?, contentType, cached, remaining }`; 429 when the daily voice cap is spent |

Every voice call counts toward the daily cap, including cache hits (abuse protection).

## Cost estimates (`lib/ai-pricing.ts`, rough)

| Call | Estimate |
| --- | --- |
| gpt-4o-mini revise (~450 tokens) | ~$0.0002 to $0.001 |
| gpt-4o-mini coach advise | ~$0.0003 |
| ElevenLabs `eleven_multilingual_v2`, 80 to 180 chars | ~$0.015 to $0.03 (≈ $0.18 / 1k chars) |
| Same cue, cache hit | $0 |
| Chip revise, heuristic | $0 |

Worst case free user: 3 voice cues/day is bounded by the cap, but the app plays 1/day. A cue changes with the day's data, so cross-user cache hits are rare. To halve voice cost set `ELEVENLABS_MODEL=eleven_flash_v2_5`.

## Env

| Var | Role |
| --- | --- |
| `ELEVENLABS_API_KEY` | Secret (`wrangler secret put`). Missing → stub (text-only) |
| `ELEVENLABS_VOICE_ID` | Optional voice; default premade voice |
| `ELEVENLABS_MODEL` | Optional; default `eleven_multilingual_v2` |
| `VOICE_PROVIDER` | `elevenlabs` \| `stub`; empty = elevenlabs if key present |

Smoke: `apps/api/scripts/smoke-ai-budget-voice.mjs`.

## Credits (AMI-125, migration `0009_ai_credits.sql`)

User-facing monthly credits sit on top of the daily call caps above. Code: `lib/ai-credits.ts` (config), `services/credits-*.ts`, `routes/credits.ts`. Heuristic replies and provider failures cost 0 (the hold is released).

| Feature | Credits |
| --- | ---: |
| `revise`, `coach`, `meal_estimate`, `chef_chat`, `voice_tts` | 1 |
| `recipe_gen` | 2 |
| `meal_plan` | 3 |
| `plan_gen` | 5 |

| Cap | Free | Pro (RevenueCat entitlement) |
| --- | ---: | ---: |
| Monthly grant (lazy, UTC month, no rollover) | 40 | 400 |
| Absolute ceiling incl. referral bonus | 60 | 600 |
| Referral bonus per month | +20 | +20 |
| Provider cost per month | $0.50 | $6 |
| `meal_plan` / `plan_gen` actions per month | 2 / 2 | 20 / 12 |

`AI_CREDITS_MODE`: `off` (no ledger), `shadow` (default: ledger written, never blocks, logs what enforce would block), `enforce` (402 `ai_credits_exhausted` when empty, 429 `ai_spend_cap` / `ai_action_cap`). Overrides: `AI_CREDITS_FREE_GRANT`, `AI_CREDITS_PRO_GRANT`, `AI_USD_CAP_FREE_MICROS`, `AI_USD_CAP_PRO_MICROS`, `REFERRAL_TOPUP_ENABLED` (default off).

Wired so far: `POST /v1/coach/advise` (LLM path only, via `withAiCredits`). Send `x-mirra-ai-mode: heuristic` to stay on free rules after a 402. Other call sites (revise, plan gen, meal plan, estimate, voice) still use the old gate and are next. Smoke: `apps/api/scripts/smoke-credits.mjs`.
