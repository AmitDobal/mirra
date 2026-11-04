# S41 — You / Profile v2

Project `16036285274438790381` · prompt `stitch/prompts/s41_profile_v2.md` · Stitch screen `fae59e7ff5654122b3ce5935c3c4b850` (MOBILE, 390pt wide, full scroll height).

Purpose: replaces S24 You. The refresh-button row at the top is gone (dead space); refresh is pull-to-refresh only
(`ScreenScroll refreshing/onRefresh` already exists in `YouScreen.tsx`, so the build just deletes the `RefreshCw` row).
The page opens on the profile card and shows every onboarding answer and preference, grouped Body / Training / Nutrition / Coach,
with chevron rows in the S24 `Row` style (`apps/mobile/src/features/you/you-settings.tsx`). Every S24 item that ships today is kept.

## Field inventory (only fields that exist)

Contracts: `packages/contracts/src/onboarding.ts` (`OnboardingProfileSchema`, `OnboardingPreferencesSchema`), `me.ts`, `preferences.ts`,
`notifications.ts`, `credits.ts`. Labels: `apps/mobile/src/content/onboarding.ts`, `cuisines.ts`, `trainer-personas.ts`, `rank.ts`, `strength.ts`.
Mapping from onboarding answers: `apps/mobile/src/features/onboarding/map-body.ts`. Onboarding routes: `apps/mobile/app/(onboarding)/*`.

| Row on S41 | Source field | Editable today |
| --- | --- | --- |
| Name, email, avatar initials | `me.user.name/email/image` | No (auth provider) |
| `PRO` pill, Subscription `Pro · Active` | `me.entitlement.status` | Paywall / restore (`handleManageSub`) |
| Sex (`Male` chip + row) | `profile.sex` (female/male/unspecified) | Onboarding `body-stats` only |
| Age | `profile.ageYears` | Onboarding `body-stats` only |
| Height | `profile.heightCm` (+ `preferences.units`) | Onboarding `body-stats` only |
| Weight | `profile.weightKg` | Onboarding; weight log (`contracts/weight.ts`) |
| Goal weight, Pace | `profile.goalWeightKg`, `profile.pace` | Onboarding `target` only |
| Units | `preferences.units` | Onboarding (derived from ft/lb) only |
| Goal | `preferences.primaryGoal` | Onboarding `goal` only |
| Physique | `preferences.physiqueTarget` | Onboarding `physique` only |
| Experience | `preferences.experience` | Onboarding `experience` only |
| Training days, Session length | `preferences.trainDays`, `sessionMinutes` | Onboarding `schedule`; plan chat (schedule/session) |
| Equipment | `preferences.equipment` | Onboarding `equipment`; plan chat |
| Training location | `preferences.trainingLocation` | Yes, You (`PATCH /v1/me/preferences`) |
| About your days | `preferences.lifestyleNotes` | Onboarding `lifestyle` only |
| Active plan block | local plan (`getCurrentPlan`) | Coach / plan chat |
| Diet, Cuisines, Foods to avoid | `dietTags`, `cuisineStyles`, `foodsAvoid` | Yes, `DietPrefsSheet` (`PATCH /v1/me/preferences`) |
| Meals per day | `preferences.mealsPerDay` (null = 4) | Plan chat only |
| Your trainer | `preferences.trainerPersona` | Yes, `PersonaGrid` |
| Speak coach cues, In-app alerts, Adaptive rebuild | `SpeakCuesToggle`, `AlertsToggle` (`notification-prefs.inAppEnabled`), disabled placeholder | Yes / Yes / Soon |
| Kinetic rank, Strength tier, AI credits | badge store, strength store, `credits.ts` (pro grant 400) | Read-only (tap opens detail) |
| Google CONNECTED, Connected (Health/Withings/USDA), Legal, Sign out, Delete account | `me.accounts`, `YouFooterGroups.tsx` | As today |

Rows marked "Onboarding only" have no in-app edit path yet. The chevron is the design target; the build needs edit sheets plus
an API change (`UpdatePreferencesBodySchema` accepts only diet/cuisine/avoid/trainer/location, and there is no profile PATCH).
Until then, ship those rows without the chevron or route them to plan chat. Not shown on purpose: `timezone`, `mirrorMediaId`,
notification `streakReminders/workoutReminders/quiet hours` (no UI today).

Sample values are illustrative and use real enum labels (Recomp, Athletic, 1–2 years, High protein, Steady, Imperial).

## Passes
1. Generate: layout and copy correct, but Stitch returned a DESKTOP canvas (2560 wide) and broken trainer photos.
2. Edit: MOBILE 390pt frame fixed. Trainer photos still broken (Stitch image URLs return 403).
3. Edit: trainer photos replaced with neutral silhouette tiles (first try returned "no screen produced"; one retry succeeded). Pass.

## Deviations
- Trainer cards show grey silhouette placeholders, not portraits (Stitch image gen failed). Build keeps the real persona portraits from `PersonaGrid`.
- Name `Drill Sergeant` truncates to `Drill Serge…` in the 104pt card. Build: allow two lines or a wider card.
- Tab pill renders at the end of the tall export, not floating over content, and the 96pt bottom clearance under Danger zone is missing. Build keeps the floating pill and the 6rem scroll clearance.
- Stitch named the screen "S41 — You / Profile (Clean Trainer Tiles)"; the folder name is the source of truth.
- Kinetic rank and Strength tier now sit side by side as two tiles instead of stacked full width.
- The PRO pill and `Pro · Active` subscription line read `me.entitlement.status`. Today S24 shows `Plan v{n} · {status}` in this row.

Files: `screen.png`, `code.html`, `stitch.json`.
