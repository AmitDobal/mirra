# AMI-142 smoke (iOS Simulator, Expo Go 58, iPhone 16 Pro Max)

Real app screens vs Stitch (`stitch_mirra_ai_personal_trainer/s25–s27`). Today's plan was mocked in the store (the day-test user was on a rest day) so the lift list renders. API PATCH on Swap was exercised (rejected for the mock workout id, handled with an inline notice).

| File | Stitch |
| --- | --- |
| 01-s25-hub-top | S25 session hero + protocol |
| 02-s25-hub-rest-day | S25 on a rest day (library only) |
| 03-s25-hub-library | S25 library chips + grid |
| 04/05-s26-detail-* | S26 detail (in session) |
| 06-s26-detail-library-item | S26 for a library lift (Add to session) |
| 07-s27-swap-sheet / 08-s27-add-sheet | S27 swap / add |

Known gaps vs Stitch: only 11 unique photos (reused across the 20-lift seed catalog), no form video (v2), no Reorder, RPE and microcycle labels omitted (no data).
