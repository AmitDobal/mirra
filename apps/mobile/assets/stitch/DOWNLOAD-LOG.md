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


## AMI-148 female Stitch S02c (2026-11-02)

- Screen: Stitch `0608cba57d2e45e5a1aaa6091a4e397b` (S02c — Welcome Hook Photo Female)
- Local: `stitch_mirra_ai_personal_trainer/s02_welcome_hook_female/screen.png` + `code.html`
- Wired: welcome v2 hero + portrait-woman from S02c hero; `s13_paywall/female/coach-cutout.jpg` real crop
- Also dropped PLACEHOLDER-* under s06/s11/s12 female (same S02c hero until more gendered Stitch people export)
