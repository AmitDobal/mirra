# AMI-144 smoke (iOS Simulator, Expo Go, iPhone 16 Pro Max)

Real app, real day-test API (`day-test-1`), real AI week plan (no mocks). Device clock Mon 02:40 IST, UTC is still Sunday. Plan `weekStart` is 2026-10-26, so "today" resolves by weekday slot, not UTC date.

| File | Shows |
| --- | --- |
| 01-exercise-monday-workout | Today = Mon: Upper Body Strength, protocol = Dumbbell Bench Press / Row / Shoulder Press / Bicep Curl (matches plan) |
| 02-exercise-thursday-rest-day | Thu rest slot: "Rest / recovery", protocol cleared, library only |
| 03-exercise-tuesday-lower-body | Tue: Lower Body Strength, Squat / Deadlift / Lunges / Calf Raises, copy "Tuesday's session" |
| 04-exercise-wednesday-full-body | Wed: Full Body Circuit |

Day selection for 02-04 was driven through `useTodayStore.selectDay` (same call the week strip taps make) by a temporary, uncommitted timer, because simulator taps were unavailable.
