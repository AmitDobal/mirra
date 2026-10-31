# Mirra personalization wave (2026-10-31)

Research: Cal AI = photo → multimodal LLM → macros + describe/barcode fallbacks. BeKaizen/EnerZee = daily brief from real logs, streaks on honesty, remaining fuel CTAs.

## Shipped (≥15)

1. **MealEstimator port** — vendor-swappable meal AI  
2. **OpenAI vision estimate** — Cal AI–style plate → kcal/macros  
3. **Heuristic meal estimate** — keyword offline fallback  
4. **`POST /v1/meals/estimate`** — estimate without saving  
5. **Fuel Snap** — camera/library → estimate → save meal  
6. **Describe meal** — text path when photo is ambiguous  
7. **Personal day context** — fuel/training/check-in snapshot from D1  
8. **`GET /v1/insights/today`** — briefing, tips, win, streak  
9. **Coach personal context** — advise uses real kcal/protein/workout state  
10. **Heuristic coach personalization** — regex on snapshot when offline  
11. **Today Mirra brief card** — win + next tip + remaining chips  
12. **Post-log fuel tip** — remaining protein/kcal coaching  
13. **Progress gallery honesty** — no Stitch stock as “your” photos  
14. **Progress history chronology** — real URI or empty slot + date/pose  
15. **Streak + weekly lifts** on Progress from insights  
16. **Win-of-day** surfaced on Coach + Today  
17. **Integrations.md** documents MealEstimator  

## Verify

```bash
# describe estimate (OpenAI when keyed)
curl -X POST http://127.0.0.1:8787/v1/meals/estimate \
  -H 'x-mirra-user-id: day-test-1' -H 'Content-Type: application/json' \
  -d '{"description":"chicken rice broccoli"}'

curl http://127.0.0.1:8787/v1/insights/today -H 'x-mirra-user-id: day-test-1'
```

Sim: Fuel → Snap (camera) or Describe; Today shows brief; Coach advise uses your logs; Progress shows only your photos.
