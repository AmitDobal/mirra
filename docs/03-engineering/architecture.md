# Mirra — architecture

## System context

```
┌─────────────┐     HTTPS      ┌──────────────────────────┐
│ Expo app    │ ─────────────► │ CF Worker (Hono API)     │
│ apps/mobile │ ◄───────────── │ apps/api                 │
└──────┬──────┘   JSON + auth  └─────┬─────────┬──────────┘
       │                             │         │
       │ RevenueCat SDK              │ D1      │ R2
       ▼                             ▼         ▼
┌─────────────┐              ┌──────────┐  ┌────────┐
│ App Store / │  webhooks ─► │ SQLite   │  │ Photos │
│ Play + RC   │              │ tables   │  │ blob   │
└─────────────┘              └──────────┘  └────────┘
                                    │
                              Queues (plan / rebuild)
                                    │
                              AI PlanGenerator port
```

## Design → code contract

| Source | Consumed by |
| --- | --- |
| `stitch_mirra_ai_personal_trainer/*/screen.png` | Visual QA — pixel intent |
| `stitch_mirra_ai_personal_trainer/*/code.html` | Layout / class hints (not runtime) |
| `stitch_mirra_ai_personal_trainer/kinetic_performance/DESIGN.md` | Tokens → `apps/mobile/src/theme/` |
| External athlete images in HTML | Download once into `apps/mobile/assets/` (license check) |

**Rule:** If Stitch and a doc disagree, **Stitch wins** for visuals. Product copy/flows still follow `docs/02-product/`.

## Mobile layers

```
app/                 # Expo Router only (screens)
src/
  theme/             # colors, radii, type, spacing from Stitch
  ui/                # Button, Card, Chip, TabDock, ProgressRing…
  features/
    onboarding/
    today/
    workout/
    fuel/
    coach/
    progress/
    paywall/
    auth/
  lib/
    api/             # fetch client + TanStack hooks
    auth/
    purchases/       # PurchasesPort → RevenueCat | stub
    ai/              # unused on client for generation — server only
    config/env.ts
  content/           # strings
```

## API layers (`apps/api`)

```
src/
  index.ts           # Worker fetch + queue consumers
  app.ts             # Hono app compose
  routes/            # one file per resource group
  services/          # business logic
  db/                # drizzle schema + migrations
  ports/             # PlanGenerator, ObjectStore, Clock
  adapters/          # openai | workers-ai | r2 | revenuecat-webhook
  middleware/        # auth, rateLimit, requestId
  lib/               # errors, ids, crypto
```

## Core domain flows (backend)

| Flow | Trigger | Persist | Side effects |
| --- | --- | --- | --- |
| Onboarding complete | `POST /v1/onboarding` | `profiles`, `preferences` | Enqueue `plan.generate` |
| Week reveal | Queue job done | `plans`, `plan_days`, `workouts` | Push optional |
| Start / log workout | REST | `workout_sessions`, `set_logs` | — |
| Log meal | REST + optional R2 | `meals` | Macro rollups |
| Check-in | `POST /v1/check-ins` | `check_ins` | If skip → enqueue `plan.rebuild` |
| Rebuild apply | `POST /v1/plans/rebuild/apply` | new `plans` version | Invalidate Today cache |
| Progress photo | signed URL → R2 | `progress_photos` | — |
| Subscribe | RevenueCat webhook | `entitlements` | Unlock Pro gates |

## Extensibility ports

| Port | v1 adapter | Future |
| --- | --- | --- |
| `PlanGenerator` | Heuristic stub → LLM | Swap model without route changes |
| `ObjectStore` | R2 | S3-compatible |
| `PurchasesVerifier` | RevenueCat webhooks | Play + App Store direct |
| `Notifier` | Expo push stub | OneSignal etc. |
| `IdempotencyStore` | D1 | KV |

## Environments

| Env | API | D1 | R2 | Mobile |
| --- | --- | --- | --- | --- |
| local | `wrangler dev` | local D1 | local/miniflare | Expo → localhost / tunnel |
| staging | `mirra-api-staging` | staging DB | staging bucket | staging RC key |
| prod | `mirra-api` | prod DB | prod bucket | prod RC + Apple |

## Failure principles

- Plan generation async — UI shows S11 skeleton until plan ready (poll or WS later; v1 = poll)
- Rebuild never deletes history — versioned plans
- Webhook handlers idempotent on `event_id`
