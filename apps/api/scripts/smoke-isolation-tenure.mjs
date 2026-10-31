#!/usr/bin/env node
/**
 * Smoke: per-user isolation + tenure-scaled history window.
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-isolation-tenure.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (fresh x-mirra-user-id per run).
 *
 * Optional env:
 *   SMOKE_LOCAL_D1=1       back-date users.created_at through `wrangler d1 execute --local`
 *                          (run from apps/api; API must share the same local D1 state).
 *   SMOKE_PERSIST_TO=path  forwarded to wrangler --persist-to.
 *   SMOKE_MEAL_PLAN=1      also generate a meal plan for A (may call the LLM).
 *   SMOKE_ASSERT_STYLE=1   assert coach message has no U+2014 and no ";" (after sanitizer deploys).
 *
 * I1 A: onboard, POST meal, POST weight, (opt) meal plan
 * I2 B: onboard; B's lists / fuel today / insights never contain A's ids, name, kcal or kg
 * I3 B GET/PATCH/DELETE /v1/meals/:A (only when the route exists for A) -> 404
 * I4 B cannot touch A's meal plan (opt)
 * T1 tenure matrix: day 0 always; 10/15/20/60/180d when SMOKE_LOCAL_D1=1 (else SKIP)
 * S1 coach advise style (opt)
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const RUN = Date.now();
const A = `smoke-iso-a-${RUN}`;
const B = `smoke-iso-b-${RUN}`;
const LOCAL_D1 = process.env.SMOKE_LOCAL_D1 === "1";
const API_DIR = fileURLToPath(new URL("..", import.meta.url));
const DAY_MS = 86_400_000;

const A_MEAL_NAME = `iso-secret-meal-${RUN}`;
const A_MEAL_KCAL = 1337;
const A_KG = 91.37;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const skip = (label, why) => console.log(`SKIP  ${label}  - ${why}`);

const call = async (user, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const ONBOARD = {
  profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, goalWeightKg: 74, timezone: "UTC" },
  preferences: {
    primaryGoal: "lose_fat",
    experience: "months",
    equipment: ["full_gym", "dumbbells"],
    trainDays: [1, 3, 5],
    sessionMinutes: 45,
    dietTags: [],
    foodsAvoid: null,
    cuisineStyles: ["indian"],
    units: "metric",
  },
};

const isoDate = (offsetDays) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
const leaks = (value) => {
  const s = JSON.stringify(value ?? null);
  return s.includes(A_MEAL_NAME) || s.includes(String(A_KG));
};

/** Mirrors apps/api/src/services/user-tenure.ts historyWindowDays. */
const expectedWindow = (tenureDays) => {
  if (tenureDays < 7) return tenureDays || 1;
  if (tenureDays < 14) return 7;
  if (tenureDays < 21) return 14;
  return 21;
};

const backdateUser = (userId, tenureDays) => {
  const createdMs = Date.now() - tenureDays * DAY_MS - 60_000;
  const sql = `UPDATE users SET created_at = ${createdMs} WHERE id = '${userId.replace(/'/g, "''")}';`;
  const args = ["wrangler", "d1", "execute", "mirra-db", "--local", "--command", sql];
  if (process.env.SMOKE_PERSIST_TO) args.push("--persist-to", process.env.SMOKE_PERSIST_TO);
  execFileSync("npx", args, { cwd: API_DIR, stdio: "pipe" });
};

const seedCheckIns = async (userId, days) => {
  for (let i = 1; i <= days; i += 1) {
    await call(userId, "POST", "/v1/check-ins", { localDate: isoDate(-i), status: "done" });
  }
};

const isolation = async () => {
  console.log("\n-- isolation --");
  check((await call(A, "PUT", "/v1/onboarding", ONBOARD)).status === 200, "I1 A onboarding -> 200");
  const meal = await call(A, "POST", "/v1/meals", {
    name: A_MEAL_NAME,
    mealSlot: "lunch",
    kcal: A_MEAL_KCAL,
    proteinG: 40,
    carbsG: 120,
    fatG: 30,
  });
  const mealId = meal.json?.id;
  check(meal.status === 201 && typeof mealId === "string", "I1 A POST /v1/meals -> 201", `status ${meal.status}`);
  const weight = await call(A, "POST", "/v1/weight", { kg: A_KG });
  check(weight.status === 201, "I1 A POST /v1/weight -> 201", `status ${weight.status}`);

  let planId = null;
  if (process.env.SMOKE_MEAL_PLAN === "1") {
    // Meal plans need an active workout plan (async job).
    const gen = await call(A, "POST", "/v1/plans/generate", {});
    for (let i = 0; gen.json?.jobId && i < 60; i += 1) {
      const job = (await call(A, "GET", `/v1/plans/jobs/${gen.json.jobId}`)).json;
      if (job?.status === "done" || job?.status === "failed") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const plan = await call(A, "POST", "/v1/meal-plan/generate", {});
    planId = plan.json?.id ?? null;
    check(plan.status === 200 && planId, "I1 A meal-plan generate -> 200", `status ${plan.status}`);
  } else {
    skip("I1 A meal-plan generate", "set SMOKE_MEAL_PLAN=1 (may cost LLM tokens)");
  }

  check((await call(B, "PUT", "/v1/onboarding", ONBOARD)).status === 200, "I2 B onboarding -> 200");

  const bMeals = await call(B, "GET", "/v1/meals?limit=50");
  check(bMeals.status === 200 && !leaks(bMeals.json), "I2 B GET /v1/meals has none of A's data", `status ${bMeals.status}`);
  check(!(bMeals.json?.items ?? []).some((m) => m.id === mealId), "I2 B meals list excludes A's meal id");
  const bWeight = await call(B, "GET", "/v1/weight");
  check(bWeight.status === 200 && !leaks(bWeight.json), "I2 B GET /v1/weight has none of A's data", `status ${bWeight.status}`);
  const bFuel = await call(B, "GET", "/v1/fuel/today");
  check(bFuel.status === 200 && !leaks(bFuel.json), "I2 B GET /v1/fuel/today has none of A's data", `status ${bFuel.status}`);
  check(bFuel.json?.logged?.kcal === 0, "I2 B fuel logged.kcal = 0", String(bFuel.json?.logged?.kcal));
  const bInsights = await call(B, "GET", "/v1/insights/today");
  check(bInsights.status === 200 && !leaks(bInsights.json), "I2 B GET /v1/insights/today has none of A's data");
  const aFuel = await call(A, "GET", "/v1/fuel/today");
  check(aFuel.json?.logged?.kcal === A_MEAL_KCAL, "I2 control: A fuel logged.kcal = 1337", String(aFuel.json?.logged?.kcal));

  if (!mealId) return;
  const route = `/v1/meals/${mealId}`;
  const aGet = await call(A, "GET", route);
  if (aGet.status === 200) check((await call(B, "GET", route)).status === 404, "I3 B GET A's meal -> 404");
  else skip("I3 GET /v1/meals/:id", `route not available (A got ${aGet.status})`);

  const aPatch = await call(A, "PATCH", route, { name: `${A_MEAL_NAME}-own` });
  if (aPatch.status === 200) {
    check((await call(B, "PATCH", route, { name: "hijack" })).status === 404, "I3 B PATCH A's meal -> 404");
    const after = await call(A, "GET", "/v1/fuel/today");
    check(!JSON.stringify(after.json).includes("hijack"), "I3 A's meal not changed by B");
  } else skip("I3 PATCH /v1/meals/:id", `route not available (A got ${aPatch.status})`);

  const bDelete = await call(B, "DELETE", route);
  if (bDelete.status === 405 || bDelete.status === 404) {
    if (bDelete.status === 404) check(true, "I3 B DELETE A's meal -> 404");
    else skip("I3 DELETE /v1/meals/:id", "not implemented yet (405)");
  } else check(false, "I3 B DELETE A's meal -> 404", `status ${bDelete.status}`);
  const aStill = await call(A, "GET", "/v1/fuel/today");
  check(aStill.json?.meals?.length >= 1, "I3 A's meal still present after B DELETE");

  if (planId) {
    const bToday = await call(B, "GET", "/v1/meal-plan/today");
    check(bToday.json?.plan?.id !== planId, "I4 B meal-plan/today is not A's plan");
    const bLog = await call(B, "POST", `/v1/meal-plan/${planId}/log`, { mealItemId: "x" });
    check(bLog.status === 404, "I4 B log on A's plan -> 404", `status ${bLog.status}`);
  }
};

const tenure = async () => {
  console.log("\n-- tenure --");
  const matrix = [0, 10, 15, 20, 60, 180];
  for (const days of matrix) {
    const label = `T1 tenure ${days}d`;
    if (days > 0 && !LOCAL_D1) {
      skip(label, "set SMOKE_LOCAL_D1=1 to back-date users.created_at (local API only)");
      continue;
    }
    const user = `smoke-iso-t${days}-${RUN}`;
    check((await call(user, "PUT", "/v1/onboarding", ONBOARD)).status === 200, `${label} onboarding -> 200`);
    if (days > 0) {
      try {
        backdateUser(user, days);
      } catch (err) {
        check(false, `${label} back-date via wrangler`, String(err.message).split("\n")[0]);
        continue;
      }
    }
    await seedCheckIns(user, Math.min(days, 6));
    const res = await call(user, "GET", "/v1/insights/today");
    const ctx = res.json ?? {};
    const want = expectedWindow(days);
    check(res.status === 200, `${label} insights -> 200`, `status ${res.status}`);
    check(ctx.tenureDays === days, `${label} tenureDays = ${days}`, String(ctx.tenureDays));
    check(ctx.historyWindowDays === want, `${label} window = ${want}d`, String(ctx.historyWindowDays));
    check(ctx.history?.windowDays === want, `${label} history.windowDays = ${want}`, String(ctx.history?.windowDays));
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(ctx.joinedAt ?? "") && ctx.briefing?.includes(`Joined ${ctx.joinedAt} (${days}d)`),
      `${label} briefing has "Joined YYYY-MM-DD (${days}d)"`,
    );
    check(
      typeof ctx.historySummary === "string" && ctx.historySummary.startsWith(`${want}d:`),
      `${label} historySummary non-empty, starts "${want}d:"`,
      ctx.historySummary,
    );
    check(!/breakfast|lunch|dinner/i.test(ctx.historySummary ?? ""), `${label} summary has no meal list`);
    if (days === 0) {
      check(/Weight 80kg/.test(ctx.briefing ?? ""), `${label} briefing keeps weight line`);
    }
  }
  if (!LOCAL_D1) {
    console.log("NOTE  fresh smoke user has tenureDays=0 (window 1d); run with SMOKE_LOCAL_D1=1 for 10/15/20/60/180d.");
  }
};

const style = async () => {
  console.log("\n-- coach style --");
  if (process.env.SMOKE_ASSERT_STYLE !== "1") {
    skip("S1 coach style", "set SMOKE_ASSERT_STYLE=1 once the sanitizer is deployed");
    return;
  }
  const res = await call(A, "POST", "/v1/coach/advise", { status: "partial" });
  const msg = res.json?.message ?? "";
  check(res.status === 200 && msg.length > 0, "S1 coach advise -> 200 with message", `status ${res.status}`);
  check(!msg.includes("\u2014"), "S1 message has no em dash (U+2014)", msg);
  check(!msg.includes(";"), 'S1 message has no ";"', msg);
};

const main = async () => {
  console.log(`API ${BASE}  A=${A}  B=${B}  local-d1=${LOCAL_D1}`);
  await isolation();
  await tenure();
  await style();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
