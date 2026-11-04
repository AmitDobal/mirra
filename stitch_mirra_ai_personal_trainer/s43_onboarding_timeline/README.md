# S43 — Onboarding: Your timeline + commit

Project `16036285274438790381` · prompt `stitch/prompts/s43_onboarding_timeline.md` · Stitch screen `fa21f44099fa4aea9511bcc7238db99e` (MOBILE, 390pt wide, full scroll height).

Purpose: last onboarding step after S12 week reveal, before auth / paywall. Shows the estimated timeline to the goal (82 → 75 kg, Steady, start Nov 4 2026),
the estimate range, milestones, a summary of the answers, and a hold-to-commit pledge. Arch: `docs/03-engineering/goal-timeline.md` §7 (worked example `goal-82-75-steady`).
Build: `app/(onboarding)/timeline.tsx`, ticket AMI-180.

Numbers match the doc's day-0 fixture: expected around Mar 6, range Feb 16 – Apr 26, ~18 weeks, first change Dec 16 (−2.5 kg), halfway 78.5 kg Jan 3, whatIf Feb 16.

## Passes
1. Generate (`b637107f88984624a80ec6c765277652`): layout, copy and chart correct, but Stitch returned a DESKTOP canvas (2560 wide).
2. Edit: MOBILE 390pt frame; wedge edges pinned to FEB (lower) and APR (upper), expected dot under MAR. Pass.

## Deviations
- Chart is 150pt tall (prompt); the arch doc says 140pt for the onboarding variant. Build follows the doc.
- The doc's 5 % milestone (77.9 kg, Jan 13) is not shown; the prompt lists three milestones on purpose.
- Disclaimer reads "Estimate based on your pace and plan." (no logs yet at onboarding). The doc's shared string includes "logs"; use the shorter one on S43 or update `content/goal.ts`.
- `RANGE` value wraps to two lines (`Feb 16 –` / `Apr 26`). Acceptable; build may use a smaller size to keep one line.
- `code.html` carries Stitch's full Tailwind theme (including unused error/tertiary tokens); only Kinetic tokens are rendered.

Files: `screen.png`, `code.html`, `stitch.json`.
