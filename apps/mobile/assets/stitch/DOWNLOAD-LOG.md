# Stitch AIDA download log

Date: 2026-10-30T19:28:18Z

- Downloaded: **28** / 28
- Failures: **0**

All 28 images downloaded successfully (curl -L, 1 retry on failure).

## AMI-146
- s02_welcome_hook_v2 (PNG + code from S02 + assets)
- s13_paywall_hard (screen.png + code.html + coach-athlete.jpg)
- s09b_pick_trainer_v2 (screen.png + code.html)

## AMI-147 gendered onboarding people (2026-11-02)

- `s06_target|s11_generating_week|s12_week_reveal|s13_paywall` now have `male/` + `female/` folders.
- Male: copies of existing athlete photos.
- Female: `PLACEHOLDER-*` from `s02_welcome_hook/portrait-woman-athlete.jpg` until Stitch female exports drop in (same filenames without PLACEHOLDER- prefix when ready).
- Screens use `useOnboardingImagery()` — welcome stays mixed.


## AMI-149 S13c Pro Paywall Highlights (2026-11-02)

- Screen: Stitch `fa45df7a53f3448bbaaada55c416af53` (S13c — Pro Paywall Highlights)
- Local: `stitch_mirra_ai_personal_trainer/s13c_paywall_highlights/` + `apps/mobile/assets/stitch/s13c_paywall_highlights/`
- Files: `screen.png`, `code.html`, `coach-hero.jpg` (wired as `s13cPaywallHighlights.coachHero`)

## AMI-148 female Stitch S02c (2026-11-02)

- Screen: Stitch `0608cba57d2e45e5a1aaa6091a4e397b` (S02c — Welcome Hook Photo Female)
- Local: `stitch_mirra_ai_personal_trainer/s02_welcome_hook_female/screen.png` + `code.html`
- Wired: welcome v2 hero + portrait-woman from S02c hero; `s13_paywall/female/coach-cutout.jpg` real crop
- Also dropped PLACEHOLDER-* under s06/s11/s12 female (same S02c hero until more gendered Stitch people export)

## AMI-150 S28 Plan Chat Proposal Confirm (2026-11-02)

- Screen: Stitch `9a4b513350bf45f7b6363af5f45e118f` (project `16036285274438790381`)
- Local: `stitch_mirra_ai_personal_trainer/s28_plan_chat_proposal/` + `assets/stitch/s28_plan_chat_proposal/` (`screen.png`, `code.html`)
- No raster photos in S28 (icons + tokens only), so `index.ts` needs no new `require`
- Wired in: `features/coach/ProposalCard.tsx` (before/after card, Yes, apply / Want to change)
