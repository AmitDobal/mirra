# AMI-147 smoke — sex-aware onboarding imagery

Body-stats sex defaults to **null**; Continue disabled until selection.

Imagery rule (`useOnboardingImagery` / `imageryGenderForSex`):

| Sex | People assets |
| --- | --- |
| `female` | `assets/stitch/*/female/` (PLACEHOLDER-* from `portrait-woman-athlete` until Stitch export) |
| `male` | `assets/stitch/*/male/` |
| `prefer_not` | same as male |

Evidence (asset sources wired into target / generating / week-reveal / paywall):

- `female-01-target.jpg` … `female-04-paywall.jpg`
- `male-01-target.jpg` … `male-04-paywall.jpg`
- `prefer_not-04-paywall-uses-male.jpg`

Welcome stays mixed (pre-sex). Drop-in: replace `female/PLACEHOLDER-*` with Stitch exports keeping filenames.