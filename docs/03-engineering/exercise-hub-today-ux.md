# Exercise hub + Today IA (2026-11-02)

## Decision

**Daily check-in is not a primary nav destination.** It stays a short modal/sheet (Energy / Sleep / Soreness) opened from a small Today chip when due — same pattern as competitors (Whoop journal optional; Strong/Hevy have no check-in). The Coach tab slot that currently mounts `CheckInFlow` is **repurposed to Exercise**.

**Nav (P0):** Today · Exercise · Fuel · Progress · You  
Check-in route remains reachable via `openCheckIn()` (hidden from dock).

## Why Exercise hub

Fuel/meal snap is the quality bar. Users already get a week plan at onboarding; they still need a place to **see today’s session, open exercise instructions, swap/add**, like Strong/Hevy/Fitbod library + session detail — with Mirra AI coaching tone and Kinetic Performance photography.

## Exercise hub P0

1. Today’s session card + exercise list (thumbnails)  
2. Exercise detail: hero image, 3–5 step instructions, muscles, sets/reps/load  
3. Swap (3 equipment-aware alternatives) + Add via search  
4. Library chips: muscle / equipment (seeded catalog; `PlanExercise` links by id when possible)  

**v2:** custom exercises, form video, PR history, drag week, supersets.

## Today IA (reorder)

1. Compact week strip (shorter height)  
2. **Today’s Focus** hero immediately under week  
3. Twin targets: workout + fuel (image-forward)  
4. Routine preview / exercise teaser → Exercise tab  
5. Fuel photos / log row  
6. Check-in: small pill only when `checkInDue` — not a full-width row above Focus  
7. Weekly mirror chip: move below Focus or into Progress — not above Focus  

## Stitch source of truth

| Screen | Folder | Stitch id |
| --- | --- | --- |
| S15c Today reordered | `stitch_mirra_ai_personal_trainer/s15c_today_focus_first/` | `782bdcea91cf429e84f1ae1924a4e245` |
| S25 Exercise hub | `…/s25_exercise_hub/` | `4aa75d29437447b69f55dfd523484f25` |
| S26 Exercise detail | `…/s26_exercise_detail/` | `e7038f7521ce4b5fba55c63f1846ed2f` |
| S27 Swap / add sheet | `…/s27_exercise_swap_add/` | `28b7c62d77cf41de9d84176e678a579e` |

Project `16036285274438790381` · Design system `assets/d2a8f52576ed4d96b4ccfe8a1a6b8539`.

Tickets: AMI-141 (Today), AMI-142 (Exercise hub).

## Research

`/tmp/mirra-qa/exercise-hub-ux/FINDINGS.md` (session). Competitors: Strong, Hevy, Fitbod, NTC, Freeletics, Future/Ladder.
