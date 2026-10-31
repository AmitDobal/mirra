#!/usr/bin/env node
/**
 * Smoke: cuisine prefs + cursor pagination.
 *   API_BASE=https://mirra-api.amit-dobalwork.workers.dev node scripts/smoke-cuisine-pagination.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (fresh x-mirra-user-id per run).
 *
 * K1 onboarding without / empty / invalid cuisineStyles -> 400; ["indian"] -> 200; GET /v1/me echoes it
 * K2 PATCH /v1/me/preferences cuisineStyles (empty -> 400, valid -> stored)
 * K3 meal-plan generate respects cuisine (no foods tagged only for other cuisines)
 * K4 plan chat: "only chinese food" replaces, "prefer Indian food" merges, meals rebuilt on-cuisine
 * K5 pagination: /v1/check-ins, /v1/progress/photos, /v1/meals (limit, cursor, clamp, bad cursor)
 */
const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const USER = process.env.SMOKE_USER ?? `smoke-cuisine-${Date.now()}`;

/** Foods that are NOT universal, with the cuisines they belong to (mirror of data/vetted-foods.ts). */
const FOOD_CUISINES = {
  salmon_cooked: ["japanese", "american", "mediterranean", "korean"],
  cod_cooked: ["american", "mediterranean"],
  shrimp_cooked: ["chinese", "thai", "japanese", "mexican", "mediterranean", "korean"],
  tofu_firm: ["chinese", "japanese", "korean", "thai", "indian"],
  tempeh: ["other", "thai"],
  edamame: ["japanese", "korean", "chinese"],
  lentils_cooked: ["indian", "middle_eastern", "mediterranean"],
  chickpeas_cooked: ["indian", "middle_eastern", "mediterranean"],
  black_beans_cooked: ["mexican", "american"],
  corn_tortilla: ["mexican"],
  pasta_cooked: ["mediterranean", "american"],
  bagel_plain: ["american"],
  granola: ["american"],
  cheddar_cheese: ["american", "mexican"],
  cottage_cheese_lowfat: ["american", "indian", "middle_eastern"],
  hummus: ["middle_eastern", "mediterranean"],
  quinoa_cooked: ["mediterranean", "american", "other"],
  avocado: ["mexican", "american", "mediterranean", "japanese"],
  peanut_butter: ["american", "thai"],
  soy_milk_unsweetened: ["chinese", "japanese", "korean", "thai", "american"],
  almond_milk_unsweetened: ["american", "mediterranean"],
};

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": USER },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prefs = (cuisineStyles) => ({
  primaryGoal: "build_muscle",
  experience: "months",
  equipment: ["full_gym", "dumbbells"],
  trainDays: [1, 3, 5],
  sessionMinutes: 45,
  dietTags: [],
  foodsAvoid: null,
  ...(cuisineStyles === undefined ? {} : { cuisineStyles }),
  units: "metric",
});
const onboard = (cuisineStyles) =>
  call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, timezone: "UTC" },
    preferences: prefs(cuisineStyles),
  });
const myCuisines = async () => (await call("GET", "/v1/me")).json?.preferences?.cuisineStyles;
const planFoodIds = (plan) => (plan?.meals ?? []).flatMap((m) => m.items.map((i) => i.foodId));
const offCuisine = (ids, allowed) =>
  [...new Set(ids)].filter((id) => FOOD_CUISINES[id] && !FOOD_CUISINES[id].some((c) => allowed.includes(c)));

const ensureTrainingPlan = async () => {
  const gen = await call("POST", "/v1/plans/generate", {});
  for (let i = 0; i < 45; i += 1) {
    const job = (await call("GET", `/v1/plans/jobs/${gen.json.jobId}`)).json;
    if (["done", "succeeded"].includes(job?.status)) return true;
    if (job?.status === "failed") return false;
    await sleep(1500);
  }
  return false;
};

const walk = async (path, pageSize) => {
  const ids = [];
  let cursor = null;
  let pages = 0;
  do {
    const q = `limit=${pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await call("GET", `${path}?${q}`);
    if (res.status !== 200) return { ids, pages, error: res.status };
    ids.push(...res.json.items.map((x) => x.id));
    cursor = res.json.nextCursor;
    pages += 1;
  } while (cursor && pages < 20);
  return { ids, pages };
};

const checkPagination = async (label, path, expected) => {
  const first = await call("GET", `${path}?limit=2`);
  check(first.status === 200 && first.json.items.length === 2, `${label} limit=2 -> 2 items`, `status ${first.status}`);
  check(typeof first.json?.nextCursor === "string", `${label} nextCursor present`, String(first.json?.nextCursor).slice(0, 24));
  const { ids, pages } = await walk(path, 2);
  check(ids.length === expected && new Set(ids).size === expected, `${label} cursor walk: ${expected} unique`, `${ids.length} over ${pages} pages`);
  const clamp = await call("GET", `${path}?limit=999`);
  check(clamp.status === 200 && clamp.json.items.length <= 50, `${label} limit=999 clamps`, `${clamp.json?.items?.length} items`);
  const last = await call("GET", `${path}?limit=${expected}`);
  check(last.json?.nextCursor === null, `${label} exact page -> nextCursor null`);
  const bad = await call("GET", `${path}?cursor=not-a-cursor!`);
  check(bad.status === 400, `${label} bad cursor -> 400`, `status ${bad.status}`);
};

const main = async () => {
  console.log(`API ${BASE} user ${USER}`);

  // K1 onboarding
  for (const [label, value] of [["missing", undefined], ["empty", []], ["invalid id", ["klingon"]]]) {
    const res = await onboard(value);
    check(res.status === 400, `K1 onboarding cuisineStyles ${label} -> 400`, `status ${res.status}`);
  }
  const ok = await onboard(["indian"]);
  check(ok.status === 200, "K1 onboarding [indian] -> 200", `status ${ok.status}`);
  check(JSON.stringify(await myCuisines()) === '["indian"]', "K1 /v1/me echoes cuisineStyles", JSON.stringify(await myCuisines()));

  // K2 PATCH
  const empty = await call("PATCH", "/v1/me/preferences", { cuisineStyles: [] });
  check(empty.status === 400, "K2 PATCH empty cuisineStyles -> 400", `status ${empty.status}`);
  const none = await call("PATCH", "/v1/me/preferences", {});
  check(none.status === 400, "K2 PATCH {} -> 400", `status ${none.status}`);
  const patched = await call("PATCH", "/v1/me/preferences", { cuisineStyles: ["japanese", "korean"] });
  check(
    patched.status === 200 && patched.json.preferences.cuisineStyles.join() === "japanese,korean",
    "K2 PATCH cuisineStyles stored",
    JSON.stringify(patched.json?.preferences?.cuisineStyles),
  );
  await call("PATCH", "/v1/me/preferences", { cuisineStyles: ["indian"] });

  // K3 meal generate respects cuisine
  check(await ensureTrainingPlan(), "K3 training plan ready (targets)");
  const gen = await call("POST", "/v1/meal-plan/generate", { force: true });
  check(gen.status === 200, "K3 meal-plan generate (indian)", `status ${gen.status}`);
  const bad = offCuisine(planFoodIds(gen.json?.plan ?? gen.json), ["indian"]);
  check(planFoodIds(gen.json?.plan ?? gen.json).length > 0 && bad.length === 0, "K3 no off-cuisine foods for indian", `foods ${[...new Set(planFoodIds(gen.json?.plan ?? gen.json))].join(",")} off: ${bad.join(",") || "none"}`);

  // K4 plan chat
  const only = await call("POST", "/v1/coach/revise", { message: "only chinese food please", scope: "meal" });
  check(only.status === 200 && only.json.changes?.some((c) => c.kind === "cuisine_styles"), "K4 'only chinese food' -> cuisine_styles change", `source ${only.json?.source} msg: ${only.json?.message}`);
  check(JSON.stringify(await myCuisines()) === '["chinese"]', "K4 cuisines replaced -> [chinese]", JSON.stringify(await myCuisines()));
  const todayCn = (await call("GET", "/v1/meal-plan/today")).json?.plan;
  const badCn = offCuisine(planFoodIds(todayCn), ["chinese"]);
  check(planFoodIds(todayCn).length > 0 && badCn.length === 0, "K4 rebuilt meals on-cuisine (chinese)", `off: ${badCn.join(",") || "none"}`);
  const add = await call("POST", "/v1/coach/revise", { message: "prefer Indian food too", scope: "meal" });
  const merged = await myCuisines();
  check(add.status === 200 && merged?.includes("chinese") && merged?.includes("indian"), "K4 'prefer Indian food' merges", JSON.stringify(merged));

  // K5 pagination
  for (let i = 0; i < 5; i += 1) {
    const d = `2026-01-${String(10 + i).padStart(2, "0")}`;
    const r = await call("POST", "/v1/check-ins", { localDate: d, status: "done" });
    if (r.status !== 201) check(false, `check-in ${d}`, `status ${r.status}`);
    const p = await call("POST", "/v1/progress/photos", { pose: "front", takenAt: Date.UTC(2026, 0, 10 + i), localUri: `file:///smoke-${i}.jpg` });
    if (p.status !== 201) check(false, `photo ${i}`, `status ${p.status}`);
    const m = await call("POST", "/v1/meals", { name: `Smoke meal ${i}`, mealSlot: "snack", kcal: 100 + i, eatenAt: Date.UTC(2026, 0, 10 + i, 12) });
    if (m.status !== 201) check(false, `meal ${i}`, `status ${m.status}`);
  }
  await checkPagination("K5 check-ins", "/v1/check-ins", 5);
  await checkPagination("K5 photos", "/v1/progress/photos", 5);
  await checkPagination("K5 meals", "/v1/meals", 5);
  const photos = await call("GET", "/v1/progress/photos?limit=5");
  const times = photos.json.items.map((p) => p.takenAt);
  check(times.every((t, i) => i === 0 || times[i - 1] >= t), "K5 photos newest-first");

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
