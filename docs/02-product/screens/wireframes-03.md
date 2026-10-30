# Wireframes S17–S24 + modals notes

---

## S17 — Workout complete

**Title:** `Session logged`  
**Meta mono:** duration · volume · exercises done  
**Buttons:**  
1. Primary: `Done` → S15  
2. Secondary: `How hard was it?` RPE 1–10 chips (feeds adaptation)  
**Looks:** No confetti. Thin success rule in olive.

---

## S18 — Fuel (Tab: Fuel)

**Tab bar** Fuel selected.  
**Top:** `Today` macros — three thin meters P/C/F + kcal remaining 13px  
**Buttons:**  
1. Primary: `Log meal` → S19  
2. Ghost: `Snap meal` → camera then S19 prefilled  
**List:** meals logged (time · name · kcal) 12px rows  
**Empty:** `Nothing logged. Start with lunch.` + primary  
**Looks:** Meters as bars not giant rings. No gamified pets.

---

## S19 — Log meal

**Top:** Cancel · `Log meal` · Save (accent text)  
**Fields:** name · kcal · P/C/F steppers · meal slot Breakfast/Lunch/Dinner/Snack  
**Optional:** photo thumb  
**Buttons:** `Save` → S18 · `Cancel`  
**Looks:** Form densile; labels 10px.

---

## S20 — Check-in (Tab: Coach root)

**Tab bar** Coach selected.  
**Title:** `Daily check-in`  
**AI line 12px:** short contextual prompt (e.g. missed yesterday)  
**Chips:** `Done as planned` · `Partial` · `Skipped` · `Soreness` · `Low sleep` · `Travel`  
**Optional note** field 12px  
**Buttons:**  
1. Primary: `Submit check-in` → if skipped path S21 else toast + stay  
**History:** last 3 check-ins mono 10px list  
**Looks:** Chat-like but not bubble spam. One prompt. No “I’m your AI bestie”.

---

## S21 — Rebuild preview

**Title:** `Week rebuilt`  
**Sub:** `You skipped Tue lift. Here’s the fix.`  
**Body:** before/after 7-day strips stacked (old muted, new ink)  
**Diff list 11px:** moved sessions · adjusted kcal ±  
**Buttons:**  
1. Primary: `Apply rebuild` → S15  
2. Ghost: `Keep old plan` → S15  
**Looks:** Diff UI, not celebration.

---

## S22 — Progress (Tab: Progress)

**Tab bar** Progress.  
**Segments:** `Photos` | `Weight`  
**Photos grid:** 2-col tight thumbs · empty CTA `Add mirror photo` → S23  
**Weight:** sparkline small + `Log weight` → M06  
**Disclaimer 9px:** `Photos track shape over time. Not a clinical body-fat estimate.`  
**Buttons:** `Add photo` primary floating or top-right text  

---

## S23 — Add progress photo

**Camera / library**  
**Buttons:** `Capture` · `Choose` · `Save` · `Cancel`  
**Toggle:** `Front` | `Side`  
**Looks:** Same privacy note as S10.

---

## S24 — You / Settings (Tab: You)

**Tab bar** You.  
**Header:** name/email 13px · plan badge `Trial` / `Pro` 9px mono  
**Rows (settings list):**  
- `Edit goals` → onboarding subset  
- `Reminders` → M10  
- `Manage subscription` → M07  
- `Restore purchases`  
- `Privacy` · `Terms` → M08  
- `Sign out`  
- `Delete account` destructive → M09  
**Buttons:** rows are full-width 44pt hits; no extra primary.  
**Looks:** iOS settings density. No colorful tiles.

---

## Modal copy cheat-sheet

| ID | Title | Primary | Secondary |
| --- | --- | --- | --- |
| M01 | `Know when to check in?` | `Enable reminders` | `Not now` |
| M03 | `End workout?` | `End` | `Keep going` |
| M04 | `Swap exercise` | `Replace` | `Cancel` |
| M06 | `Log weight` | `Save` | `Cancel` |
| M07 | `Subscription` | `Open App Store` | `Close` |
| M09 | `Delete account?` | `Delete` | `Cancel` |
