/** Cloudflare bindings for Mirra API. Regenerate via `npm run cf-typegen` when wrangler changes. */
export type MirraEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  APP_NAME: string;
  APP_VERSION: string;
  /**
   * DEV ONLY — set `"true"` in wrangler vars for local/smoke / day-test.
   * When enabled, `x-mirra-user-id` (alias `x-user-id`) bypasses session auth
   * and upserts an ephemeral users row. Ignored when any of MIRRA_ENV / APP_ENV /
   * ENVIRONMENT is `production` (fail-closed).
   */
  ALLOW_DEV_USER_HEADER?: string;
  /**
   * Runtime marker. Prefer `MIRRA_ENV=production` for real prod Workers.
   * Also honors `APP_ENV` / `ENVIRONMENT` = `production` for fail-closed checks.
   */
  MIRRA_ENV?: string;
  APP_ENV?: string;
  ENVIRONMENT?: string;
  /** Better Auth base URL (e.g. http://127.0.0.1:8787 or workers.dev). */
  APP_URL?: string;
  /** Better Auth signing secret — set via wrangler secret / .dev.vars. */
  BETTER_AUTH_SECRET?: string;
  /** Google OAuth (Better Auth social). Both required to enable Google. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /**
   * AI backend: `openai` | `heuristic` | `anthropic` | `workers-ai`.
   * Empty = auto (OpenAI key → openai, else heuristic). See integrations.md.
   */
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  /** Chat model id; defaults to gpt-4o-mini when unset. */
  OPENAI_MODEL?: string;
  /** Optional OpenAI-compatible base URL (local mock for smoke). Default api.openai.com/v1. */
  OPENAI_BASE_URL?: string;
  /** Chef chat: max user turns per planned-meal thread (default 8). */
  RECIPE_CHAT_MAX_TURNS?: string;
  /** Chef chat: max user messages per minute per user (default 6). */
  RECIPE_CHAT_RATE_PER_MIN?: string;
  /** Reserved for Anthropic PlanGenerator / CoachAdvisor adapters. */
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  /** ElevenLabs TTS (spoken coach cues). Secret: `wrangler secret put ELEVENLABS_API_KEY`. */
  ELEVENLABS_API_KEY?: string;
  /** Voice id; defaults to a premade voice when unset. */
  ELEVENLABS_VOICE_ID?: string;
  /** TTS model; defaults to eleven_multilingual_v2 (eleven_flash_v2_5 is ~half price). */
  ELEVENLABS_MODEL?: string;
  /** `elevenlabs` | `stub`. Empty = elevenlabs when a key exists, else stub (text-only). */
  VOICE_PROVIDER?: string;
  /** `off` | `shadow` | `enforce`. Default `shadow` (ledger written, never blocks). */
  AI_CREDITS_MODE?: string;
  /** Monthly credit grant overrides (integers). Defaults: free 40, pro 400. */
  AI_CREDITS_FREE_GRANT?: string;
  AI_CREDITS_PRO_GRANT?: string;
  /** Monthly provider-cost ceilings in USD micros (1_000_000 = $1). Defaults: free $0.50, pro $6. */
  AI_USD_CAP_FREE_MICROS?: string;
  AI_USD_CAP_PRO_MICROS?: string;
  /** `true` lets referral redemptions award bonus credits. Default off (stub). */
  REFERRAL_TOPUP_ENABLED?: string;
};
