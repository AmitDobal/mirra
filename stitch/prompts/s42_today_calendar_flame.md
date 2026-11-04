# S42 — Today week strip: tiny streak flame replaces the "workout done" dot

Output dir: `stitch_mirra_ai_personal_trainer/s42_today_calendar_flame` · Base: edit of S40 streak9 (`3e188c5ee2cf4706855569372d21ff2b`).
Run: `node scripts/stitch/generate.mjs edit --screen 3e188c5ee2cf4706855569372d21ff2b --prompt "$(sed -n '/^EDIT PROMPT/,$p' stitch/prompts/s42_today_calendar_flame.md | tail -n +2)" --out stitch_mirra_ai_personal_trainer/s42_today_calendar_flame`

EDIT PROMPT
Change ONLY the week strip card (M T W T F S S / 2 3 4 5 6 7 8). Keep the card's exact size, position, padding, corner radius and colors. The card height must NOT increase.
Under each date number there is one fixed 12pt marker slot (the slot exists for all 7 days, always the same height, 4pt below the number):
- M 2 and T 3 are completed workout days: in the slot show a very small FILLED crimson flame icon (#ff6b8a, the same flame glyph as the streak chip in the header, 11pt tall, no glow, no circle, no background). Date numbers stay on-surface #e5e2e1.
- W 4 is today: keep the lime #cbf150 filled circle behind the dark number 4 exactly as now. Its marker slot is empty.
- T 5, F 6, S 7, S 8 are future days: plain letters and numbers, empty marker slot. No dots anywhere.
Do not add dots, rings, check marks, labels, legends or any text. Change nothing else on the screen: header chips, focus card, tab pill and empty canvas stay identical.
