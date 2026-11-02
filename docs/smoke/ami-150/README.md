# AMI-150 smoke

- `stitch-s28-375.png` — Stitch S28 reference.
- `app-pending-ios.png` — Expo Go iOS sim (iPhone 16 Pro Max) of `PlanChatScreen` with a seeded pending proposal (temp route, not committed). Shows the card at full width, lime left accent, Review chip, before/after rows, Want to change / Yes, apply.
- Gap vs Stitch: no per-row detail chips / "↳" lines (API has no such data). Composer lock state is covered in code (`Reply after you decide…` + lock icon, quick prompts hidden) but the dev error toast hid the dock in this capture (no API in sim).
