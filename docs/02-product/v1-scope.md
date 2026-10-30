# V1 scope

## In

- Expo iOS-first app (Android later)
- Onboarding: goals, equipment, schedule, food prefs + optional mirror photo
- Generated **Week 1** diet targets + workout list (mock AI OK until API ticket)
- Daily check-in UI + local “missed → rebuild” stub
- Progress: weight + photo gallery (on-device / SecureStore paths)
- Auth shell when API exists (Better Auth Expo pattern from HitDM — not in first scaffold day)
- Paywall UI + **purchases interface** with stub; RevenueCat wire-up ticket later
- Push permission + local reminder stubs

## Out (v1)

- Clinical / DEXA-like body composition claims
- Live form correction camera
- Human coach chat
- Full Indian regional food graph
- Wearable-required onboarding
- Ads

## Screen map

Canonical **24 screens**: `screens/INDEX.md`. Flows: `flows.md`. Wireframes: `screens/wireframes-*.md`.

## Acceptance bar (testers)

- Every screen reachable from UI (not deep-link only)
- Back returns correctly
- Primary buttons ≥44pt
- Empty and filled plan states
- Skip check-in shows rebuild stub message
- Paywall opens; purchase stub does not crash
