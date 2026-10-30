# Decisions

| Date | Decision |
| --- | --- |
| 2026-10-30 | **GO** on AI PT with Mirror→Week hook + rebuild-on-skip USP; not unique-for-unique’s sake — proven category + switch reason |
| 2026-10-30 | **Market:** US iOS first (high ARPU). India not launch for revenue |
| 2026-10-30 | **Working name:** Mirra. LockIn rejected (App Store collision) |
| 2026-10-30 | **Price target:** $12.99/mo or $79.99/yr (RevenueCat) |
| 2026-10-30 | **Stack:** Expo 57 + Router + NativeWind + Moti + Zustand + Zod; Query + SecureStore + RevenueCat patterns from hitdm-app / lowline / AppForge tearead |
| 2026-10-30 | **Process:** PM orchestrates subagents; STATUS + handoff only; ≤250 lines/file; no feature code until Wave 1 |
| 2026-10-30 | Body composition: progress photos/trends only — no medical BF% claims in v1 |
| 2026-10-31 | **UI SoT:** `stitch_mirra_ai_personal_trainer/` — same-to-same screens, tokens, assets |
| 2026-10-31 | **Backend:** Cloudflare Workers + Hono + D1 + R2 + Queues (HitDM-like). TypeScript/`nodejs_compat`. **Not Spring Boot** |
| 2026-10-31 | **Payments:** RevenueCat for iOS/Android IAP. Dodo only for future web — not App Store bypass |
| 2026-10-31 | **Code gates:** ≤300 lines/file; theme tokens; Zod contracts; ports for AI/purchases/R2; security.md baseline |
| 2026-10-31 | **Repo shape:** monorepo `apps/mobile` + `apps/api` + `packages/contracts` |
