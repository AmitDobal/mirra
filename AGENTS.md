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

- **PM** → `PROMPT-PM.md` — STATUS, handoff, dispatch. No feature code.
- **Builders** → one ticket, path index, ≤400 word return.
- Files ≤ **300** lines (prefer 250). Theme tokens; no hex in UI. Zod contracts.
- **Integrations = ports + adapters.** Never call OpenAI / RevenueCat / R2 / etc. from UI or routes directly. Factories pick the provider (`AI_PROVIDER`, purchases stub vs RC). See `docs/03-engineering/integrations.md`. New vendor = new adapter + factory case, same port.

## Skills

`react-native-expo`, `react-native-core`, `react-native-reusables`, `avoid-ai-design`, `context-budget`, Cloudflare Workers skills when touching `apps/api`
