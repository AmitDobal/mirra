# Mirra — agent notes

US iOS AI personal trainer. **UI must match Stitch exports exactly.**

## Design source of truth

`stitch_mirra_ai_personal_trainer/` — per-screen `screen.png` + `code.html`, tokens in `kinetic_performance/DESIGN.md`.  
Do not invent alternate colors, radii, or tab chrome.

## Stack source of truth

`docs/03-engineering/stack.md` — Expo 57 mobile + **Cloudflare Workers (Hono/D1/R2)** API.  
**Not Spring Boot.** Payments: **RevenueCat** on mobile.

Mirror client patterns from:

1. `/Users/vasusethia/Documents/projects/hitdm-app`
2. `/Users/vasusethia/Documents/projects/lowline`
3. `/Users/vasusethia/Documents/projects/AppForge/apps/tearead`

Mirror backend patterns from:

1. `/Users/vasusethia/Documents/projects/hitdm` (Workers, D1, R2, Queues, Drizzle)

## PM vs builders

- **Lead / orchestrator seat** → dispatch only. **Never** implement `apps/mobile` / `apps/api` feature code. Rule: `.cursor/rules/91-orchestrate-dont-build.mdc`.
- **Single ship line** → only `main` (or one short-lived `integrate/*` merged same session). Never EAS/day-test from a dirty primary or unmerged WIP. Rule: `.cursor/rules/92-single-integrate-branch.mdc`. Expo styling = `sx()` / StyleSheet only (NativeWind/`className` is off).
- **PM** → `PROMPT-PM.md` — STATUS, handoff, dispatch. No feature code.
- **Builders** → one ticket, path index, ≤400 word return. Push branch. Smoke-test with real screenshots vs Stitch when UI.
- Files ≤ **300** lines (prefer 250). Theme tokens; no hex in UI. Zod contracts.
- **Integrations = ports + adapters.** Never call OpenAI / RevenueCat / R2 / etc. from UI or routes directly. Factories pick the provider (`AI_PROVIDER`, purchases stub vs RC). See `docs/03-engineering/integrations.md`. New vendor = new adapter + factory case, same port.

## Skills

`react-native-expo`, `react-native-core`, `react-native-reusables`, `avoid-ai-design`, `context-budget`, Cloudflare Workers skills when touching `apps/api`
