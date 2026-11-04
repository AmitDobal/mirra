# Wave: Strength Tiers + anatomy + plan-chat diff v2 (AMI-161..169)

Architecture: `docs/03-engineering/strength-tiers-and-chat-diff.md` (read your ticket's sections only).
Stitch prompts: `stitch/prompts/s34..s40_*.md`. Exports land in `stitch_mirra_ai_personal_trainer/s34_*`..`s40_*`.

| ID | Title | Wave | Depends on | Area |
| --- | --- | --- | --- | --- |
| AMI-161 | Exercise library, muscle taxonomy, name resolver + ExerciseTagger port | 1 | none | API + contracts |
| AMI-162 | Real anatomy SVG (M/F, front/back) + tier visual primitives | 1 | S37 colors approved | mobile |
| AMI-163 | Plan-chat diff v2 core: typed items, drafts, intent v2, real meal previews | 1 | none | API + contracts |
| AMI-164 | Kinetic Rank S33 fidelity, sx split, Today header / streak / rank chips | 1 | S40 approved | mobile |
| AMI-165 | Strength engine: standards, scoring lib, D1, endpoints, complete hook | 2 | AMI-161 | API + contracts |
| AMI-166 | Plan-chat v2 workout side: exercise swap/add/remove, schedule move, full_gym fix | 2 | AMI-161, AMI-163 | API |
| AMI-167 | Plan-chat proposal v2 UI (S39) | 2 | AMI-163, S39 | mobile |
| AMI-168 | Strength map, muscle detail, tier ladder screens (S34/S35/S37) | 3 | AMI-162, AMI-165 | mobile |
| AMI-169 | Exercise detail anatomy v2 + tier card, workout complete tier-up (S36/S38) | 3 | AMI-161, AMI-162, AMI-165 | mobile |

Parallel: everything inside one wave has disjoint file ownership. AMI-167 can start as soon as AMI-163 merges (it does not wait for AMI-165/166).

## Shared-file locks (append-only edits, rebase on `origin/main` before PR)

`packages/contracts/src/index.ts` · `apps/api/src/db/schema/index.ts` · `apps/api/src/app.ts` (route list) · `apps/api/package.json` (scripts) · `apps/mobile/src/lib/api/index.ts` · `docs/03-engineering/integrations.md` (port table rows).

Migration numbers are reserved: `0018` AMI-161, `0019` AMI-163, `0020` AMI-165.

## Common rules (every ticket)

- Builder, not lead: one ticket, own worktree from `origin/main`, `git push -u origin HEAD`, return ≤400 words (changes, files, commands, screenshot paths, gaps). Do not edit STATUS/handoff.
- `AGENTS.md` rules: Stitch is UI truth, tokens only (no hex in UI), files ≤300 lines (prefer 250), Zod on inputs, no `any`, ports + adapters for AI, `sx()`/StyleSheet only (no `className`).
- Every D1 query filters by `user_id`. AI copy goes through `sanitizeAiCopy`.
- `npm run typecheck -w @mirra/api` and `-w @mirra/mobile` pass; lint clean; existing `test:*` scripts still pass.
- UI tickets: screenshots in `docs/smoke/<ami-id>/` at 390x844 (iPhone 15/16) and iPhone SE, next to the Stitch `screen.png`, plus one Android emulator shot. Recipe: orchestrator local-run recipe (wrangler dev :8788 + Expo Go, dev user seeded).
