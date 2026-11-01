# Daily check-in + Today UX (2026-11-02)

## Decision

**Do not show a daily “recalibration vector” picker.** That label is eng/marketing jargon. Competitors (Whoop journal, Future/Ladder coach reply, Strong/Hevy no check-in) use quick taps or skip; plan changes are coach-side, not a daily menu.

Mirra keeps the *idea* of recalibration as brand line (“Rest counts. No fallen streaks.”) but the **daily UI** is:

1. Energy 1–5  
2. Sleep Poor / OK / Great  
3. Soreness None / Some / Very (+ optional area chips)  
4. Optional note / weekly photo  

AI proposes **one** adjustment (Keep / Lighter / Short). Vector-style cards only when readiness is low or a session was missed — collapsed under “Adjust today”.

## Stitch source of truth (new)

| Screen | Folder | Stitch screen id |
| --- | --- | --- |
| S20b check-in input | `stitch_mirra_ai_personal_trainer/s20b_daily_check_in_tap/` | `196e29ac770243ccaadcfb81679c78db` |
| S15b Today light upgrade | `stitch_mirra_ai_personal_trainer/s15b_today_checkin_inline/` | `71afb4767a6b428ebdf7fc21780cf86f` |
| S20c result | `stitch_mirra_ai_personal_trainer/s20c_adjust_today/` | `f872909005b4462ea6db51978ef63feb` |

Project: `16036285274438790381` · Design system: `assets/d2a8f52576ed4d96b4ccfe8a1a6b8539` (Kinetic Performance).

## Today rules

Keep existing shell (hero workout, week strip, Start Workout, 4-tab bar). Add image-forward “How are you today?” row; meal photo fuel row; optional weekly mirror chip. Cut hero copy to title + one line + “Why?”.

## Motion (match meal-snap feel)

- Sheet / check-in enter ~200ms  
- Segment press scale 0.97  
- After submit: hero crossfade 150–250ms to adjusted workout; exercise-count pulse once  

## Hygiene

Root `.gitignore` now ignores `Expo-Go*.tar.app/`, `*.ipa`/`*.apk`/`*.aab`, mobile/api `dist`, `.eas`, Metro cache. Keep code, docs, intentional Stitch assets tracked.
