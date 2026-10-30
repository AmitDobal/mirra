# Stitch — DO NOT use one mega-prompt

Dumping all 24 screens in one prompt caused text-heavy, crowded UIs.

## Use instead

Folder: `docs/02-product/stitch/`

| File | Role |
| --- | --- |
| `00-system.md` | Shared rules — sparse text, olive, no dashboard clutter |
| `S01.md` … `S24.md` | **Detailed per-screen** layout + exact short copy |
| `ANTI-REF-too-much-text.png` | Visual ban (pills / leaderboards / promo banners) |
| `README.md` | How to generate one screen at a time |

Workflow: **one Stitch generation per Sxx** = `00-system` + `Sxx`.

Design tokens: `../DESIGN.md` (updated for copy budget).
