#!/usr/bin/env node
/**
 * Smoke test the meal-plan API against the smoke matrix in
 * docs/03-engineering/meal-plans.md (section 11, API cases only).
 *
 * Usage: node scripts/smoke-meal-plan.mjs
 * Env:   API_BASE_URL (default http://127.0.0.1:8787)
 *        SMOKE_RUN_ID (default random) - suffix for the per-scenario user ids
 * Needs ALLOW_DEV_USER_HEADER=true on the API and local D1 migrated through 0003_meal_plans.
 * `source` may be "openai" or "heuristic"; both are accepted.
 *
 * Cases (M#):
 *   M1 no active plan: generate -> 409, GET today -> {plan:null}
 *   M2 generate: 200, planned kcal within +-8% of target, valid source
 *   M3 generate twice (same cards) and force (replaces)
 *   M4 log item: 201, fuel/today logged increases, item logged, re-log idempotent
 *   M5 swap: different foods, slot kcal +-8%, logged item refuses swap (409)
 *   M6 off-plan 800 kcal -> rebalance: logged untouched, rest <= remaining; <150 -> skipped
 *   M7 other user's plan/item ids -> 404
 *   M8 allergy (nuts): no nut-tagged food in the plan
 *   M9 generate after logging: plans only remaining kcal; <150 left -> all skipped; force keeps logged
 */
const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const runId = process.env.SMOKE_RUN_ID ?? Math.random().toString(36).slice(2, 8);
const today = new Date().toISOString().slice(0, 10);

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const snippet = (s, n = 160) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const checker = (scenario) => (name, ok, detail = "") => record(`${scenario} :: ${name}`, Boolean(ok), detail);
const within = (value, target, pct) => Math.abs(value - target) <= target * pct;

const client = (userId) => async (method, path, body) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-mirra-user-id": userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text };
};

const onboard = (call, foodsAvoid) =>
  call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym"],
      trainDays: [1, 3, 5],
      sessionMinutes: 45,
      cuisineStyles: ["other"],
      ...(foodsAvoid ? { foodsAvoid } : {}),
    },
  });

/** Onboard + generate training plan + poll (meal plans need an active plan for targets). */
const ensurePlan = async (call, foodsAvoid) => {
  await onboard(call, foodsAvoid);
  const gen = await call("POST", "/v1/plans/generate", {});
  const jobId = gen.json?.jobId;
  for (let i = 0; jobId && i < 45; i++) {
    const job = (await call("GET", `/v1/plans/jobs/${jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return (await call("GET", "/v1/plans/current")).json;
};

/** Seed a training plan if the user has none, then generate the meal plan (fresh users hit 409 first). */
const generate = async (call, body = {}, foodsAvoid) => {
  let res = await call("POST", "/v1/meal-plan/generate", body);
  if (res.status === 409) {
    await ensurePlan(call, foodsAvoid);
    res = await call("POST", "/v1/meal-plan/generate", body);
  }
  return res;
};

const logOffPlan = async (call, kcal, name = "Off-plan feast") => {
  const res = await call("POST", "/v1/meals", {
    name,
    mealSlot: "dinner",
    kcal,
    proteinG: 30,
    carbsG: 80,
    fatG: 30,
  });
  if (res.status !== 201) throw new Error(`meal POST ${res.status} ${res.text}`);
};

const fuelToday = async (call) => (await call("GET", "/v1/fuel/today")).json;
const signature = (plan) => plan.meals.map((m) => `${m.slot}:${m.items.map((i) => `${i.foodId}@${i.grams}`).join("+")}`).join("|");
const foodsOf = (meal) => meal.items.map((i) => i.foodId).sort().join(",");
const slotKcal = (plan) => plan.meals.reduce((s, m) => s + m.kcal, 0);

// ---------------------------------------------------------------------------

const m1 = async () => {
  const call = client(`mp-m1-${runId}`);
  const check = checker("M1 no plan");
  const res = await call("GET", "/v1/meal-plan/today");
  check("GET today -> 200 {plan:null}", res.status === 200 && res.json?.plan === null, `HTTP ${res.status} ${snippet(res.text, 80)}`);
  const gen = await call("POST", "/v1/meal-plan/generate", {});
  check("generate without active plan -> 409", gen.status === 409, `HTTP ${gen.status} ${snippet(gen.text, 100)}`);
  const still = await call("GET", "/v1/meal-plan/today");
  check("GET today still {plan:null} after 409", still.json?.plan === null);
};

const m2 = async () => {
  const call = client(`mp-m2-${runId}`);
  const check = checker("M2 generate");
  const gen = await generate(call);
  const plan = gen.json;
  check("generate -> 200", gen.status === 200, `HTTP ${gen.status} ${snippet(gen.text, 120)}`);
  if (gen.status !== 200) return;
  check("source is openai|heuristic", ["openai", "heuristic"].includes(plan.source), plan.source);
  check("date = today", plan.date === today, plan.date);
  check("has meals with items", plan.meals.length >= 3 && plan.meals.every((m) => m.items.length > 0 && m.status === "planned"), `meals=${plan.meals.length}`);
  check("planned kcal within 8% of target", within(plan.planned.kcal, plan.targets.kcal, 0.08), `planned=${plan.planned.kcal} target=${plan.targets.kcal}`);
  check("planned = sum of meals", plan.planned.kcal === slotKcal(plan) || Math.abs(plan.planned.kcal - slotKcal(plan)) <= plan.meals.length);
  check("items carry grams + unit + macros", plan.meals.every((m) => m.items.every((i) => i.grams > 0 && i.unitLabel && i.kcal > 0)));
  check("logged = 0, remaining = targets", plan.logged.kcal === 0 && plan.remaining.kcal === plan.targets.kcal, `logged=${plan.logged.kcal} remaining=${plan.remaining.kcal}`);
  const got = await call("GET", "/v1/meal-plan/today");
  check("GET today returns same plan", got.json?.plan?.id === plan.id && signature(got.json.plan) === signature(plan));
};

const m3 = async () => {
  const call = client(`mp-m3-${runId}`);
  const check = checker("M3 idempotent");
  const first = await generate(call);
  const second = await call("POST", "/v1/meal-plan/generate", {});
  check("second generate -> 200", second.status === 200, `HTTP ${second.status}`);
  check("same plan id", second.json?.id === first.json?.id);
  check("same cards", Boolean(second.json) && signature(second.json) === signature(first.json));
  const forced = await call("POST", "/v1/meal-plan/generate", { force: true });
  check("force -> 200 same day id", forced.status === 200 && forced.json?.id === first.json?.id, `HTTP ${forced.status}`);
  check("force replaced item ids", forced.json?.meals.every((m) => !first.json.meals.some((o) => o.id === m.id)));
  check("force keeps kcal within 8%", within(forced.json?.planned.kcal ?? 0, forced.json?.targets.kcal ?? 1, 0.08), `planned=${forced.json?.planned.kcal}`);
};

const m4 = async () => {
  const call = client(`mp-m4-${runId}`);
  const check = checker("M4 log");
  const plan = (await generate(call)).json;
  if (!plan) return check("plan generated", false);
  const before = await fuelToday(call);
  const item = plan.meals[0];
  const res = await call("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: item.id });
  check("log -> 201", res.status === 201, `HTTP ${res.status} ${snippet(res.text, 120)}`);
  check("meal row matches item", res.json?.meal?.kcal === item.kcal && res.json?.meal?.mealSlot === item.slot, JSON.stringify(res.json?.meal)?.slice(0, 120));
  const logged = res.json?.plan?.meals.find((m) => m.id === item.id);
  check("item status=logged + loggedMealId", logged?.status === "logged" && logged?.loggedMealId === res.json?.meal?.id);
  const after = await fuelToday(call);
  check("fuel/today logged increases by item kcal", after.logged.kcal === before.logged.kcal + item.kcal, `${before.logged.kcal} -> ${after.logged.kcal} (+${item.kcal})`);
  const today1 = (await call("GET", "/v1/meal-plan/today")).json?.plan;
  check("plan today logged.kcal = item kcal", today1?.logged.kcal === item.kcal, `logged=${today1?.logged.kcal}`);
  const again = await call("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: item.id });
  check("re-log is idempotent (200, same meal)", again.status === 200 && again.json?.meal?.id === res.json?.meal?.id, `HTTP ${again.status}`);
  const final = await fuelToday(call);
  check("no double count after re-log", final.logged.kcal === after.logged.kcal, `${after.logged.kcal} -> ${final.logged.kcal}`);
  const clientId = `smoke-meal-${runId}`;
  const second = plan.meals[1];
  const withId = await call("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: second.id, mealId: clientId });
  check("client mealId used as meal id", withId.status === 201 && withId.json?.meal?.id === clientId, `HTTP ${withId.status} id=${withId.json?.meal?.id}`);
};

const m5 = async () => {
  const call = client(`mp-m5-${runId}`);
  const check = checker("M5 swap");
  const plan = (await generate(call)).json;
  if (!plan) return check("plan generated", false);
  const target = plan.meals[1];
  const res = await call("POST", `/v1/meal-plan/${plan.id}/swap`, { mealItemId: target.id });
  check("swap -> 200", res.status === 200, `HTTP ${res.status} ${snippet(res.text, 120)}`);
  const swapped = res.json?.meals.find((m) => m.id === target.id);
  check("same item id + slot kept", swapped?.slot === target.slot && swapped?.status === "planned");
  check("different foods", Boolean(swapped) && foodsOf(swapped) !== foodsOf(target), `${foodsOf(target)} -> ${swapped && foodsOf(swapped)}`);
  check("slot kcal within 8%", Boolean(swapped) && within(swapped.kcal, target.kcal, 0.08), `${target.kcal} -> ${swapped?.kcal}`);
  const others = plan.meals.filter((m) => m.id !== target.id);
  check("other slots untouched", others.every((o) => signature({ meals: [res.json.meals.find((m) => m.id === o.id)] }) === signature({ meals: [o] })));
  const logItem = plan.meals[0];
  await call("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: logItem.id });
  const refuse = await call("POST", `/v1/meal-plan/${plan.id}/swap`, { mealItemId: logItem.id });
  check("swap of logged item -> 409", refuse.status === 409, `HTTP ${refuse.status}`);
};

const m6 = async () => {
  const call = client(`mp-m6-${runId}`);
  const check = checker("M6 rebalance");
  const plan = (await generate(call)).json;
  if (!plan) return check("plan generated", false);
  const first = plan.meals[0];
  const logRes = await call("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: first.id });
  check("logged first item", logRes.status === 201);
  await logOffPlan(call, 800);
  const fuel = await fuelToday(call);
  const rebalance = await call("POST", `/v1/meal-plan/${plan.id}/rebalance`, { reason: "off_plan_log" });
  check("rebalance -> 200", rebalance.status === 200, `HTTP ${rebalance.status} ${snippet(rebalance.text, 120)}`);
  if (rebalance.status !== 200) return;
  const rb = rebalance.json;
  const keptFirst = rb.meals.find((m) => m.id === first.id);
  check("logged item untouched", keptFirst?.status === "logged" && keptFirst.loggedMealId === logRes.json.meal.id && foodsOf(keptFirst) === foodsOf(first) && keptFirst.kcal === first.kcal);
  const remainingKcal = Math.max(0, fuel.targets.kcal - fuel.logged.kcal);
  const restKcal = rb.meals.filter((m) => m.status === "planned").reduce((s, m) => s + m.kcal, 0);
  check("remaining matches fuel/today", rb.remaining.kcal === Math.max(0, fuel.targets.kcal - fuel.logged.kcal) || rb.remaining.kcal === fuel.targets.kcal - fuel.logged.kcal, `plan=${rb.remaining.kcal} fuel=${remainingKcal}`);
  check("planned rest <= remaining kcal (+8%)", restKcal <= remainingKcal * 1.08, `rest=${restKcal} remaining=${remainingKcal}`);
  check("rest reduced vs original plan", restKcal < plan.meals.slice(1).reduce((s, m) => s + m.kcal, 0), `rest=${restKcal}`);
  check("rebalancedAt set", typeof rb.rebalancedAt === "number");
  // Blow the day: leave < 150 kcal -> leftover slots skipped.
  const fuel2 = await fuelToday(call);
  await logOffPlan(call, Math.max(1, fuel2.targets.kcal - fuel2.logged.kcal - 100), "Second feast");
  const skip = await call("POST", `/v1/meal-plan/${plan.id}/rebalance`, {});
  check("rebalance (<150 left) -> 200", skip.status === 200, `HTTP ${skip.status}`);
  const rest = (skip.json?.meals ?? []).filter((m) => m.id !== first.id);
  check("leftover slots skipped", rest.length > 0 && rest.every((m) => m.status === "skipped" || m.status === "logged"), rest.map((m) => m.status).join(","));
  const stillLogged = skip.json?.meals.find((m) => m.id === first.id);
  check("logged item still untouched", stillLogged?.status === "logged" && stillLogged.loggedMealId === logRes.json.meal.id);
};

const m7 = async () => {
  const owner = client(`mp-m7a-${runId}`);
  const other = client(`mp-m7b-${runId}`);
  const check = checker("M7 other user");
  const plan = (await generate(owner)).json;
  if (!plan) return check("plan generated", false);
  await ensurePlan(other);
  const itemId = plan.meals[0].id;
  const log = await other("POST", `/v1/meal-plan/${plan.id}/log`, { mealItemId: itemId });
  check("log with other user's plan id -> 404", log.status === 404, `HTTP ${log.status}`);
  const swap = await other("POST", `/v1/meal-plan/${plan.id}/swap`, { mealItemId: itemId });
  check("swap -> 404", swap.status === 404, `HTTP ${swap.status}`);
  const rb = await other("POST", `/v1/meal-plan/${plan.id}/rebalance`, {});
  check("rebalance -> 404", rb.status === 404, `HTTP ${rb.status}`);
  const mine = await other("GET", "/v1/meal-plan/today");
  check("other user's GET today is not the owner's plan", mine.json?.plan === null || mine.json?.plan?.id !== plan.id);
  // Own plan id + foreign/nonexistent item id.
  const mine2 = (await other("POST", "/v1/meal-plan/generate", {})).json;
  const cross = await other("POST", `/v1/meal-plan/${mine2.id}/log`, { mealItemId: itemId });
  check("own plan + other user's item id -> 404", cross.status === 404, `HTTP ${cross.status}`);
  const ownerItem = await owner("GET", "/v1/meal-plan/today");
  check("owner's item remained planned", ownerItem.json?.plan?.meals[0]?.status === "planned");
};

const plannedKcal = (plan) => plan.meals.filter((m) => m.status === "planned").reduce((s, m) => s + m.kcal, 0);

const m9 = async () => {
  const call = client(`mp-m9-${runId}`);
  const check = checker("M9 generate after logging");
  await ensurePlan(call);
  const fuel = await fuelToday(call);
  // Leave ~600 kcal: generate must plan only what is left, not a full day.
  await logOffPlan(call, Math.max(1, fuel.targets.kcal - fuel.logged.kcal - 600), "Big lunch");
  const after = await fuelToday(call);
  const left = Math.max(0, after.targets.kcal - after.logged.kcal);
  const res = await call("POST", "/v1/meal-plan/generate", {});
  check("generate -> 200", res.status === 200, `HTTP ${res.status} ${snippet(res.text, 120)}`);
  if (res.status !== 200) return;
  const plan = res.json;
  check("remaining matches fuel/today", plan.remaining.kcal === left, `plan=${plan.remaining.kcal} fuel=${left}`);
  check("planned total <= remaining (+8%)", plannedKcal(plan) <= left * 1.08, `planned=${plannedKcal(plan)} left=${left}`);
  check("planned something", plannedKcal(plan) > 0);
  check("slot logged off-plan is not re-planned", !plan.meals.some((m) => m.slot === "dinner" && m.status === "planned"));
  check("skipped slots carry no kcal", plan.meals.filter((m) => m.status === "skipped").every((m) => m.kcal === 0));

  // Nearly full day: <150 left -> every open slot skipped, nothing planned.
  await logOffPlan(call, Math.max(1, left - 100), "Second feast");
  const full = await call("POST", "/v1/meal-plan/generate", { force: true });
  check("force with <150 left -> 200", full.status === 200, `HTTP ${full.status} ${snippet(full.text, 120)}`);
  check("no planned slots, all skipped", full.json?.meals.length > 0 && full.json.meals.every((m) => m.status === "skipped"), full.json?.meals.map((m) => m.status).join(","));
  check("planned kcal = 0", full.json?.planned.kcal === 0, `planned=${full.json?.planned.kcal}`);

  // Force keeps items already logged from the plan and only replans open slots.
  const call2 = client(`mp-m9b-${runId}`);
  const p2 = (await generate(call2)).json;
  if (!p2) return check("plan generated (force case)", false);
  const first = p2.meals[0];
  const logRes = await call2("POST", `/v1/meal-plan/${p2.id}/log`, { mealItemId: first.id });
  const forced = await call2("POST", "/v1/meal-plan/generate", { force: true });
  const kept = forced.json?.meals.find((m) => m.id === first.id);
  check("force keeps logged item", logRes.status === 201 && kept?.status === "logged" && kept.loggedMealId === logRes.json.meal.id, `HTTP ${forced.status}`);
  const f2 = await fuelToday(call2);
  const left2 = Math.max(0, f2.targets.kcal - f2.logged.kcal);
  check("force replans only open slots within remaining", forced.json && plannedKcal(forced.json) <= left2 * 1.08 && forced.json.meals.filter((m) => m.slot === first.slot).length === 1, `planned=${forced.json && plannedKcal(forced.json)} left=${left2}`);
};

const NUT_FOODS = new Set(["granola", "almonds", "walnuts", "peanut_butter", "almond_milk_unsweetened"]);

const m8 = async () => {
  const call = client(`mp-m8-${runId}`);
  const check = checker("M8 allergy nuts");
  const res = await generate(call, {}, "nuts");
  check("generate -> 200", res.status === 200, `HTTP ${res.status} ${snippet(res.text, 120)}`);
  if (res.status !== 200) return;
  const foods = res.json.meals.flatMap((m) => m.items.map((i) => i.foodId));
  const bad = foods.filter((f) => NUT_FOODS.has(f) || /nut|almond/.test(f));
  check("no nut-tagged foods in plan", bad.length === 0, bad.join(",") || `${foods.length} items`);
  const first = res.json.meals[0];
  const swap = await call("POST", `/v1/meal-plan/${res.json.id}/swap`, { mealItemId: first.id });
  const swapFoods = swap.json?.meals.flatMap((m) => m.items.map((i) => i.foodId)) ?? [];
  check("no nut foods after swap", swap.status === 200 && !swapFoods.some((f) => NUT_FOODS.has(f)), `HTTP ${swap.status}`);
  const forced = await call("POST", "/v1/meal-plan/generate", { force: true });
  const forcedFoods = forced.json?.meals.flatMap((m) => m.items.map((i) => i.foodId)) ?? [];
  check("no nut foods after force", forced.status === 200 && !forcedFoods.some((f) => NUT_FOODS.has(f)), `HTTP ${forced.status}`);
};

const run = async () => {
  console.log(`Smoke meal-plan: ${base} run=${runId} today=${today}`);
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  record("health", health?.ok === true);
  const probe = await client(`mp-probe-${runId}`)("GET", "/v1/meal-plan/today");
  record("route registered (not 404)", probe.status !== 404, `HTTP ${probe.status}`);
  for (const fn of [m1, m2, m3, m4, m5, m6, m7, m8, m9]) {
    try {
      await fn();
    } catch (err) {
      record(`${fn.name} threw`, false, String(err));
    }
  }
};

run()
  .catch((err) => record("unexpected error", false, String(err)))
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  });
