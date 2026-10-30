# Mirra — tech stack (locked)

**Design golden source:** `stitch_mirra_ai_personal_trainer/` (Stitch exports — every screen `code.html` + `screen.png` + `kinetic_performance/DESIGN.md`). UI must match **same-to-same**; do not invent a second look.

## Verdict: Node / TypeScript on Cloudflare — **not Spring Boot**

| Question | Answer |
| --- | --- |
| Cloudflare Workers? | **Yes** — same family as HitDM |
| Node.js? | **Yes** via Workers `nodejs_compat` + TypeScript |
| Spring Boot? | **No** — JVM/Spring does not run on Workers. Would force a non-CF host and break the HitDM-like ops model |

## Client (mobile)

| Layer | Choice | Mirror |
| --- | --- | --- |
| Runtime | **Expo SDK ~57** + Expo Router | `hitdm-app`, `lowline`, AppForge `tearead` |
| Language | TypeScript strict | same |
| UI | **NativeWind** + Reanimated + **Moti** | same |
| Theme | Tokens from Stitch `kinetic_performance/DESIGN.md` → `src/theme/` | stitch folder |
| Icons | lucide-react-native | same |
| State | **Zustand** | lowline |
| Forms / schemas | **Zod** | same |
| Server state | **TanStack Query** | hitdm-app / tearead |
| Secure storage | **expo-secure-store** | hitdm-app |
| Media | expo-image, image-picker, image-manipulator, camera | tearead |
| Haptics / push | expo-haptics, expo-notifications | lowline |
| Payments | **RevenueCat** (StoreKit / Play Billing) | AppForge adapters |
| Auth client | Better Auth `@better-auth/expo` | hitdm-app |

## Backend (Cloudflare — HitDM-shaped)

| Layer | Choice | Notes |
| --- | --- | --- |
| Runtime | **Cloudflare Workers** + `nodejs_compat` | Deploy with Wrangler |
| HTTP | **Hono** | Small modular routes; ≤300 lines/file |
| ORM | **Drizzle** + D1 migrations | Like HitDM `src/db` |
| DB | **Cloudflare D1** (SQLite) | Primary relational store |
| Objects | **Cloudflare R2** | Mirror / progress / meal photos |
| Cache / sessions edge | **KV** (optional) + D1 sessions | Rate limits, short caches |
| Async jobs | **Queues** | Plan generate, rebuild, push fan-out |
| Secrets | Wrangler secrets / CF Secrets Store | Never in git / client |
| Auth server | **Better Auth** on Worker | Apple / Google / email |
| AI | Provider behind interface (`PlanGenerator`) | Workers AI **or** OpenAI/Anthropic — env-swappable |
| Observability | CF Workers logs + optional PostHog | No PII in analytics props |

## Payments (important)

| Surface | Provider | Why |
| --- | --- | --- |
| **iOS / Android app** | **RevenueCat** | App Store / Play require IAP for digital subscriptions |
| Web / landing (later) | Dodo optional | HitDM pattern — **not** a substitute for mobile IAP |

Do **not** try to charge Mirra Pro only via Dodo inside the App Store binary.

## Repo shape (extensible monorepo)

```
mirra/
  apps/
    mobile/          # Expo app
    api/             # Hono Worker (wrangler)
  packages/
    contracts/       # shared Zod types + API DTOs
  stitch_mirra_ai_personal_trainer/   # design SoT (read-only for builders)
  docs/
```

Until monorepo lands, docs + stitch live at repo root; Wave 1 creates `apps/*`.

## Code quality gates

- **≤300 lines** per file (prefer ≤250)
- Routes thin; logic in `features/` + `lib/`
- Theme tokens only in `src/theme/` — **no raw hex in components**
- Copy in `src/content/` — no English hardcoding in UI
- Purchases + AI + storage behind **interfaces** (stub → live)
- Standard libs first; no custom framework soup
- Dynamic modular components (compound UI primitives under `src/ui/`)

## Security (baseline — detail in `security.md`)

- HTTPS only; cert pinning N/A at Expo layer — use SecureStore for tokens
- Session cookies / bearer with rotation; short-lived access
- Zod validate **every** request body / query
- AuthZ: user can only read/write own rows
- R2: signed short-TTL upload URLs; no public write
- Rate limit plan-generate / auth / upload
- Webhook signatures (RevenueCat) verified
- Secrets only in Worker env; mobile env = public keys only
- No medical claims; photo metadata stripped where possible

## Explicit non-goals (v1 infra)

- Spring Boot / ECS / RDS
- Self-hosted Postgres (unless forced later)
- Building a second design system beside Stitch exports
