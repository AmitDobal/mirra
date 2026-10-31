# Cuisine prefs · nav transitions · history pagination

## Plan chat + meals

`POST /v1/coach/revise` already edits **meals and workouts**. Meal intents: `foodsAvoidAdd`, `dietTagsAdd`, `forceMealRegen` → regenerate/swap via meal-plan services. Chips like “No dairy” / “Vegetarian dinner” take the free heuristic path.

## Cuisine / region food prefs (required)

### Why

Diet tags alone (vegan, etc.) still allow foods the user never eats or can’t buy locally. Users pick **cuisine styles** (Indian, American, Chinese, Japanese, Mediterranean, Mexican, …) in onboarding — **not skippable** (min 1).

### Schema

- `preferences.cuisine_json` TEXT NOT NULL DEFAULT `'[]'` — string array of cuisine ids.
- Contracts: `cuisineStyles: z.array(CuisineStyleSchema).min(1)` on onboarding preferences; PATCH `/v1/me/preferences` accepts optional `cuisineStyles`.
- Catalog foods gain optional `cuisines: string[]` tags; filter: keep food if `cuisines` intersects user prefs OR food is marked `universal`.

### Onboarding

- New required screen **after diet** (or merged into diet): multi-select cuisine chips; Continue disabled until ≥1.
- Copy in `onboarding.ts`; store in onboarding zustand → PUT `/v1/onboarding`.

### Meal plan / revise

- `filterCatalog` also applies cuisine intersect.
- Plan chat: “prefer Indian food” → `cuisineStylesAdd` intent (heuristic + OpenAI).

## Navigation transitions

Root + onboarding Stacks used `animation: "fade"` (webby). Change to `animation: "default"` (iOS slide-from-right, Android platform push) + `gestureEnabled: true`. Workout stack keeps `slide_from_bottom` modal.

## Voice

Without `ELEVENLABS_API_KEY`, API returns text only. Mobile now: **expo-speech** device TTS fallback ($0) when `audioBase64` missing. Toggle still on You.

## History pagination

Progress gallery / check-in history / meal logs:

- API: `GET /v1/progress/photos?cursor=&limit=20`, `GET /v1/check-ins?cursor=&limit=20` (cursor = createdAt|id).
- Mobile: FlatList `onEndReached` + page size 20; no dump of full history.

## Implemented (Oct 31)

- Cuisine: `CuisineStyleSchema`, `preferences.cuisine_json` (migration `0005_cuisine`, applied remote), onboarding `cuisine.tsx` after diet, `filterCatalog(diet, avoid, cuisines)` (universal staples + tagged subset; `other` or legacy `[]` = no filter), PATCH `cuisineStyles`, plan chat `cuisineStylesAdd` / `cuisineStylesOnly` ("only chinese" replaces, "prefer indian" merges), food-prefs sheet chips.
- Pagination: `GET /v1/check-ins`, `/v1/progress/photos`, `/v1/meals` → `{ items, nextCursor }`; `limit` default 20, clamped to 50; cursor = base64url(`<ms>_<id>`). `fuel/today` is now day-bounded in SQL. Mobile Progress uses FlatList + `loadMore`.
- Smoke: `apps/api/scripts/smoke-cuisine-pagination.mjs`.
