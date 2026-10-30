# Mirra

AI personal trainer — Mirror → Week + rebuild-on-skip. US iOS first.

## Design SoT

`stitch_mirra_ai_personal_trainer/` — Stitch screens + `kinetic_performance/DESIGN.md`. Implement **same-to-same**.

## Stack

See `docs/03-engineering/stack.md`.

- **Mobile:** Expo 57 (`apps/mobile`)
- **API:** Cloudflare Workers + Hono + D1 + R2 (`apps/api`) — TypeScript, **not Spring Boot**
- **Payments:** RevenueCat (mobile IAP). Dodo = web later only.

## Docs

Start at `docs/INDEX.md`. Tickets: `docs/05-project-management/STATUS.md`.
