# Screen inventory — **24** primary (+ modals)

Wireframes: `wireframes-01.md` … `03`.  
**Stitch (per screen, sparse):** `../stitch/00-system.md` + `../stitch/S01.md` … `S24.md`.  
Do **not** use one mega-prompt (see `../stitch-master-prompt.md`).

## Primary screens (Stitch set)

| ID | Name | Flow | Nav |
| --- | --- | --- | --- |
| S01 | Splash | F01 | none |
| S02 | Welcome / Hook | F01 | none |
| S03 | Goal | F02 | back + progress 1/8 |
| S04 | Experience | F02 | back + 2/8 |
| S05 | Body stats | F02 | back + 3/8 |
| S06 | Target | F02 | back + 4/8 |
| S07 | Equipment | F02 | back + 5/8 |
| S08 | Schedule | F02 | back + 6/8 |
| S09 | Diet prefs | F02 | back + 7/8 |
| S10 | Mirror capture | F02 | back + Skip + 8/8 |
| S11 | Generating week | F02 | none (blocking) |
| S12 | Week reveal | F02 | Continue |
| S13 | Paywall | F05 | Close (X) soft |
| S14 | Auth | F03 | Skip for now / Continue |
| S15 | Today (home) | F06 | **Tab bar** |
| S16 | Workout session | F07 | Close → confirm |
| S17 | Workout complete | F07 | Done → Today |
| S18 | Fuel (nutrition) | F08 | **Tab bar** |
| S19 | Log meal | F08 | Cancel / Save |
| S20 | Check-in | F09 | **Tab Coach** or modal push |
| S21 | Rebuild preview | F09 | Keep old / Apply rebuild |
| S22 | Progress | F10 | **Tab bar** |
| S23 | Add progress photo | F10 | Cancel / Save |
| S24 | You / Settings | F10 | **Tab bar** |

## Modals / system (not separate Stitch artboards unless needed)

| ID | Name | From |
| --- | --- | --- |
| M01 | Notification pre-prompt | S12 Continue |
| M02 | iOS notification permission | M01 |
| M03 | Skip workout confirm | S16 |
| M04 | Swap exercise sheet | S16 |
| M05 | Edit macros sheet | S18 |
| M06 | Weight log sheet | S22 |
| M07 | Manage subscription | S24 |
| M08 | Legal / Privacy webview | S24 |
| M09 | Delete account confirm | S24 |
| M10 | Reminder times | S24 |

## Empty / error variants (same layout, different copy)

| Base | Variant |
| --- | --- |
| S15 | Empty week (generation failed) |
| S18 | No meals logged today |
| S22 | No photos yet |
| S20 | Already checked in today |
