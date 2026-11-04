# S42 — Today week strip: streak flame replaces "workout done" dot

Project `16036285274438790381` · prompt `stitch/prompts/s42_today_calendar_flame.md` · Stitch screen `d27955fc8871496fa1f04afd2ae4ff18`.
Base: edit of S40 `streak9/` (`3e188c5ee2cf4706855569372d21ff2b`), the newest Today screen.

Purpose: in the Today week strip, a day with a completed workout shows a tiny filled crimson flame
(`#ff6b8a`, same `local_fire_department` glyph as the S40/S29 streak chip) instead of the 6pt lime dot.

State shown: `M 2`, `T 3` done (flame) · `W 4` today (lime circle, dark number, empty slot) · `T 5`–`S 8` future (plain, empty slot).

Strip height: card is 98pt tall, identical to S40 (y 106–204pt). Inner layout tightened (14pt padding, 2pt gaps);
every day reserves the same fixed marker slot, so the strip never changes height.

Code source for the build: `apps/mobile/src/features/today/PresenceDot.tsx` (`active` state becomes the flame;
6pt slot today, flame needs ~10–12pt slot inside the same card height) and `WeekStripCard.tsx`.

Edit passes: 2 (pass 1 placed flames but grew the card from 98pt to 112pt; pass 2 restored 98pt).

Deviations accepted:
- Flame renders outlined (Material Symbols FILL axis not loaded in the Stitch renderer; HTML sets `FILL 1`) and ~8pt
  rather than 11pt. Build uses a filled 10–12pt flame.
- Muted `open` presence state (opened app, no workout) is not shown in this mock; build keeps it as the muted 6pt dot unless PM says otherwise.
- Header chips, focus card and tab pill unchanged from S40 streak9 (incl. its photo-bleed deviation).

Files: `screen.png`, `code.html`, `stitch.json`.
