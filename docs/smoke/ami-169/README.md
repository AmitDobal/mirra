# AMI-169 smoke — exercise anatomy v2 + tier card, workout tier-up

Android emulator (Medium_Phone_API_36, Expo Go 58.0.5), local `wrangler dev` :8797 with local D1, Metro :8087.
Users seeded through the API (imperial, male 80 kg, full gym, OpenAI plan); baseline sessions logged with
`POST /v1/workouts/sessions/*`, then Push Day logged in the app.

| Shot | What it shows |
|---|---|
| `android-01-s36-bench-anatomy.png` | Bench detail: S36 hero, chips, prescription (LB TARGET), front + back anatomy, chest lime, triceps / front delts lavender |
| `android-02-s36-bench-tier.png` | Legend + "Your tier" card: Platinum II, "60% to Platinum I", "Next: 175 lb × 6 for 1 session → Platinum I" |
| `android-03-s36-ai-lift-tricep-dips.png` | AI-plan lift outside the 20-lift catalog (`triceps_dip`): anatomy from plan muscles, honest "Unranked" card before any set |
| `android-04-s16-dips-lb-added.png` | Live HUD, bodyweight lift, imperial user: stepper reads "+ LB ADDED" |
| `android-05-s38-tier-up.png` | Complete screen, one promotion (Chest Diamond III → Diamond II) under the S17 stats |
| `android-06-s38-overall-row.png` | Session that unlocks overall: OVERALL Gold II "First rank" row + 4 compact rows |

Compare with `stitch-s36.png` / `stitch-s38.png`.

Not covered here: iPhone 390 / SE shots (iOS sim not used in this run); haptic success (not visible).
