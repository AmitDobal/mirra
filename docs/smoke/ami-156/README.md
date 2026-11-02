# AMI-156 smoke

- **Stitch S33:** `stitch_mirra_ai_personal_trainer/s33_kinetic_rank/` (`screen.png` + `code.html`).
- **Offline:** `npm run test:badges -w @mirra/api`.
- **API:** `pnpm db:migrate:local -w @mirra/api` then `API_BASE=http://127.0.0.1:8793 node apps/api/scripts/smoke-badges.mjs` (needs `ALLOW_DEV_USER_HEADER=true` on API). Expect 5 seeded ranks, Spark unlock after 7 check-in days, `GET /v1/badges` 401 without auth.
- **Mobile:** Today header rank chip (when unlocked) + fire chip → `/kinetic-rank`; You tab Kinetic Rank teaser; full S33 ladder screen.
