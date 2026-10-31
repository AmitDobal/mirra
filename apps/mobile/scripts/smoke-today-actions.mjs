#!/usr/bin/env node
/**
 * Smoke test GET /v1/today/actions + POST /v1/water against the spec matrix
 * (docs/03-engineering/actionable-goals-ui.md, API cases A1-A10).
 *
 * Usage: node scripts/smoke-today-actions.mjs
 * Env:   API_BASE_URL (default http://127.0.0.1:8787)
 *        SMOKE_RUN_ID (default random) - suffix for the per-scenario user ids
 *        SMOKE_D1_READBACK=0 to skip the local-D1 set read-back in A8
 * Needs ALLOW_DEV_USER_HEADER=true on the API and the local D1 migrated (water_logs).
 *
 * Time-of-day rules use the UTC hour. To stay deterministic at any hour:
 *   - A1 runs on a FUTURE plan day (hour = 0, "morning").
 *   - A3 runs on a far-PAST date with no plan day (hour = 24, "day over", no lift to miss).
 *   - A2, A4-A9 are hour-independent (OVER_KCAL / protein / session / check-in / water),
 *     so they run on today (sessions can only start "now").
 * Adaptations vs the spec table:
 *   - A9: the LOW_READINESS check-in is itself a done check-in, so next cannot be `checkin`.
 *     We assert workout=skipped, checkin=done, scenario=LOW_READINESS, next not workout/checkin.
 *   - A8: no GET for sets exists; we assert the POST echo and read the row back from local D1.
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const runId = process.env.SMOKE_RUN_ID ?? Math.random().toString(36).slice(2, 8);
const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../api");

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = iso(Date.now());
const PAST_DATE = "2020-01-15";
const noonMs = (date) => Date.parse(`${date}T12:00:00.000Z`);

const results = [];
const summary = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const snippet = (s, n = 150) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);

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

const cites = (text, n) => {
  const plain = String(Math.abs(Math.round(n)));
  return text.includes(plain) || text.includes(Number(plain).toLocaleString("en-US"));
};

/** ISO weekday key of a YYYY-MM-DD date: Mon=1 ... Sun=7 (matches `trainDays`). */
const trainKey = (date) => new Date(`${date}T12:00:00.000Z`).getUTCDay() || 7;
const TODAY_KEY = trainKey(today);
const TOMORROW = iso(Date.now() + DAY_MS);

const ensureProfile = (call, trainDays = [1, 2, 3, 4, 5, 6, 7]) =>
  call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym"],
      trainDays,
      sessionMinutes: 45,
      cuisineStyles: ["other"],
    },
  });

/**
 * Onboard + generate + poll; returns the current plan.
 * Plans cap at 5 lifts (Mon-Fri by default), so scenarios that need a lift on a given
 * weekday pass `trainDays` explicitly.
 */
const ensurePlan = async (call, trainDays) => {
  await ensureProfile(call, trainDays);
  const gen = await call("POST", "/v1/plans/generate", {});
  const jobId = gen.json?.jobId;
  for (let i = 0; jobId && i < 45; i++) {
    const job = (await call("GET", `/v1/plans/jobs/${jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return (await call("GET", "/v1/plans/current")).json;
};

/**
 * Plan generation may be an LLM (non-deterministic): retry until the plan has a lift on `date`.
 * Returns the plan either way; callers assert on the result.
 */
const ensurePlanWithLift = async (call, date) => {
  let plan = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    plan = await ensurePlan(call, [trainKey(date)]);
    if ((plan?.days ?? []).some((d) => d.date === date && d.workoutId)) break;
  }
  return plan;
};

const logMeal = async (call, name, mealSlot, kcal, proteinG, eatenAt) => {
  const res = await call("POST", "/v1/meals", {
    name,
    mealSlot,
    kcal,
    proteinG,
    ...(eatenAt ? { eatenAt } : {}),
  });
  if (res.status !== 201) throw new Error(`meal POST failed: ${res.status} ${res.text}`);
};

const actions = async (call, date) => {
  const res = await call("GET", `/v1/today/actions?date=${date}`);
  if (res.status !== 200) throw new Error(`actions ${date} -> ${res.status} ${res.text.slice(0, 200)}`);
  return res.json;
};
const goal = (a, kind) => a.goals.find((g) => g.kind === kind);

const checker = (scenario) => (name, ok, detail = "") =>
  record(`${scenario} :: ${name}`, Boolean(ok), detail);

const planWorkoutToday = (plan) => {
  const day = (plan?.days ?? []).find((d) => d.date === today && d.workoutId);
  const workout = day ? plan.workouts.find((w) => w.id === day.workoutId) : null;
  return { day, workout };
};

const startSession = async (call, workout) => {
  const session = await call("POST", "/v1/workouts/sessions", { workoutId: workout.id });
  if (session.status !== 201) throw new Error(`session start ${session.status} ${session.text}`);
  return session.json.id;
};

// ---------------------------------------------------------------------------

const a1 = async () => {
  const call = client(`ta-a1-${runId}`);
  const check = checker("A1 fresh/under");
  // Future plan day => hour 0 ("morning"). On Sundays the week has no later day: fall back to today.
  const useFuture = TODAY_KEY !== 7;
  const plan = await ensurePlanWithLift(call, useFuture ? TOMORROW : today);
  const date = useFuture ? TOMORROW : today;
  const day = (plan?.days ?? []).find((d) => d.date === date && d.workoutId);
  check("plan has a workout on the chosen day", Boolean(day), `date=${date} weekStart=${plan?.plan?.weekStart}`);
  if (!day) return;
  const a = await actions(call, date);
  const kinds = a.goals.map((g) => g.kind);
  check("next.kind=workout", a.next?.kind === "workout", `next=${a.next?.kind} scenario=${a.scenario}`);
  check(
    "goals include workout/protein/checkin/water",
    ["workout", "protein", "checkin", "water"].every((k) => kinds.includes(k)),
    kinds.join(","),
  );
  check("macros[0] kcal state=under", a.macros[0].key === "kcal" && a.macros[0].state === "under", `state=${a.macros[0].state}`);
  check("macros = kcal,protein,carbs,fat", a.macros.map((m) => m.key).join() === "kcal,proteinG,carbsG,fatG");
  check("goals <= 6, titles <= 40, reason <= 90", a.goals.length <= 6 && a.goals.every((g) => g.title.length <= 40) && a.next.reason.length <= 90);
  check("next.goalId points into goals[]", a.goals.some((g) => g.id === a.next.goalId));
  check("workout ctaRoute /workout/{id}", /^\/workout\/.+/.test(goal(a, "workout").ctaRoute), goal(a, "workout").ctaRoute);
  summary.push(["A1", `next=${a.next.kind} "${a.next.reason}"`]);
};

const a2 = async () => {
  const call = client(`ta-a2-${runId}`);
  const check = checker("A2 OVER kcal");
  await ensurePlan(call);
  const before = await actions(call, today);
  const target = before.macros[0].target;
  const over = 440;
  const total = target + over;
  await logMeal(call, "Big breakfast", "breakfast", Math.round(total * 0.35), 40);
  await logMeal(call, "Big lunch", "lunch", Math.round(total * 0.35), 40);
  await logMeal(call, "Big dinner", "dinner", total - 2 * Math.round(total * 0.35), 30);
  const a = await actions(call, today);
  const kcal = a.macros[0];
  check("macros[0].state=over", kcal.state === "over", `state=${kcal.state}`);
  check("delta = logged - target = 440", kcal.delta === kcal.logged - kcal.target && kcal.delta === over, `logged=${kcal.logged} target=${kcal.target} delta=${kcal.delta}`);
  check("remaining clamped to 0", kcal.remaining === 0);
  check("scenario=OVER_KCAL", a.scenario === "OVER_KCAL", `scenario=${a.scenario}`);
  check("next.reason cites 440", Boolean(a.next) && cites(a.next.reason, over), snippet(a.next?.reason));
  check("next.tone=alert", a.next?.tone === "alert");
  check("no checklist row is 'over' for kcal", !a.goals.some((g) => g.status === "over"));
  summary.push(["A2", `delta=${kcal.delta} next=${a.next?.kind} "${a.next?.reason}"`]);
};

const a3 = async () => {
  const call = client(`ta-a3-${runId}`);
  const check = checker("A3 low protein");
  await ensurePlan(call);
  const proteinTarget = (await actions(call, PAST_DATE)).macros[1].target;
  await logMeal(call, "Carb meal", "lunch", 500, 40, noonMs(PAST_DATE));
  const a = await actions(call, PAST_DATE);
  const p = goal(a, "protein");
  check("protein goal pending", p?.status === "pending", `status=${p?.status}`);
  check("protein metric 40/target", p?.metric?.current === 40 && p?.metric?.target === Math.round(proteinTarget), JSON.stringify(p?.metric));
  check("next.kind in {meal, protein}", ["meal", "protein"].includes(a.next?.kind), `next=${a.next?.kind} scenario=${a.scenario}`);
  check("scenario=UNDER_PROTEIN", a.scenario === "UNDER_PROTEIN", `scenario=${a.scenario}`);
  check("macros[1] protein state=under", a.macros[1].state === "under");
  summary.push(["A3", `protein ${p?.metric?.current}/${p?.metric?.target} next=${a.next?.kind}`]);
};

const a4 = async () => {
  const call = client(`ta-a4-${runId}`);
  const check = checker("A4 protein done");
  await ensurePlan(call);
  const target = (await actions(call, today)).macros[1].target;
  // 120% of target: more protein must never read as "over".
  await logMeal(call, "Protein feast", "lunch", 800, Math.round(target * 1.2));
  const a = await actions(call, today);
  const p = goal(a, "protein");
  check("protein goal done", p?.status === "done", `status=${p?.status} metric=${JSON.stringify(p?.metric)}`);
  check("protein never 'over'", p?.status !== "over" && !a.goals.some((g) => g.kind === "protein" && g.status === "over"));
  check("next is not protein", a.next?.kind !== "protein", `next=${a.next?.kind}`);
  // Boundary: exactly 95% counts as done.
  const call2 = client(`ta-a4b-${runId}`);
  await ensurePlan(call2);
  const t2 = (await actions(call2, today)).macros[1].target;
  await logMeal(call2, "Almost", "lunch", 600, Math.ceil(t2 * 0.95));
  const b = await actions(call2, today);
  check("95% of target counts as done", goal(b, "protein")?.status === "done", `logged=${goal(b, "protein")?.metric?.current}/${goal(b, "protein")?.metric?.target}`);
  summary.push(["A4", `protein ${p?.status} ${p?.metric?.current}/${p?.metric?.target}`]);
};

const a5a8 = async () => {
  const call = client(`ta-a5-${runId}`);
  const check = checker("A5 workout done");
  const check8 = checker("A8 set weight/reps");
  const plan = await ensurePlanWithLift(call, today);
  const { workout } = planWorkoutToday(plan);
  check("plan has a workout today", Boolean(workout), `days=${(plan?.days ?? []).map((d) => d.date).join(",")}`);
  if (!workout) return;
  const before = await actions(call, today);
  check("workout pending before session", goal(before, "workout")?.status === "pending", `status=${goal(before, "workout")?.status}`);
  const sid = await startSession(call, workout);
  const ex = workout.exercises?.[0];
  const set = await call("POST", `/v1/workouts/sessions/${sid}/sets`, {
    exerciseId: ex?.id ?? null,
    exerciseName: ex?.name ?? "Smoke squat",
    setIndex: 1,
    weightKg: 100,
    reps: 8,
    completed: true,
  });
  check8("POST set -> 201 echoes weightKg=100 reps=8", set.status === 201 && set.json?.weightKg === 100 && set.json?.reps === 8, `HTTP ${set.status} ${snippet(set.text, 120)}`);
  const open = await actions(call, today);
  check("workout still pending until session ends", goal(open, "workout")?.status === "pending", `status=${goal(open, "workout")?.status}`);

  if (process.env.SMOKE_D1_READBACK !== "0") {
    try {
      const out = execFileSync(
        "npx",
        ["wrangler", "d1", "execute", "mirra-db", "--local", "--json", "--command",
          `SELECT weight_kg, reps, completed FROM set_logs WHERE id = '${set.json.id}'`],
        { cwd: apiDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      const row = JSON.parse(out.slice(out.indexOf("[")))[0]?.results?.[0];
      check8("persisted in D1 (weight_kg=100, reps=8)", row?.weight_kg === 100 && row?.reps === 8, JSON.stringify(row));
    } catch (err) {
      console.log(`INFO  A8 D1 read-back unavailable (${snippet(err.message, 100)}); echo assertion only`);
    }
  }

  const done = await call("POST", `/v1/workouts/sessions/${sid}/complete`, { rpe: 7 });
  check("session complete -> 200", done.status === 200, `HTTP ${done.status}`);
  const a = await actions(call, today);
  check("workout goal done", goal(a, "workout")?.status === "done", `status=${goal(a, "workout")?.status}`);
  check("next advances (not workout)", a.next?.kind !== "workout", `next=${a.next?.kind ?? "null"}`);
  summary.push(["A5", `workout ${goal(a, "workout")?.status}; next=${a.next?.kind ?? "null"}`]);
  summary.push(["A8", `set echo weightKg=${set.json?.weightKg} reps=${set.json?.reps}`]);
};

const a6 = async () => {
  const call = client(`ta-a6-${runId}`);
  const check = checker("A6 check-in done");
  await ensurePlan(call);
  const before = await actions(call, today);
  check("checkin pending before", goal(before, "checkin")?.status === "pending");
  const res = await call("POST", "/v1/check-ins", { localDate: today, status: "done" });
  check("POST check-in -> 201", res.status === 201, `HTTP ${res.status} ${snippet(res.text, 100)}`);
  const a = await actions(call, today);
  check("checkin goal done", goal(a, "checkin")?.status === "done", `status=${goal(a, "checkin")?.status}`);
  check("next is not checkin", a.next?.kind !== "checkin", `next=${a.next?.kind}`);
  summary.push(["A6", `checkin ${goal(a, "checkin")?.status} "${goal(a, "checkin")?.subtitle}"`]);
};

const a7 = async () => {
  const call = client(`ta-a7-${runId}`);
  const check = checker("A7 water 500x2");
  await ensureProfile(call);
  const r1 = await call("POST", "/v1/water", { ml: 500 });
  const r2 = await call("POST", "/v1/water", { ml: 500 });
  check("POST /v1/water x2 -> 201", r1.status === 201 && r2.status === 201, `HTTP ${r1.status}/${r2.status} ${snippet(r1.text, 100)}`);
  check("second response hydration.loggedMl=1000", r2.json?.hydration?.loggedMl === 1000, JSON.stringify(r2.json?.hydration));
  const bad = await call("POST", "/v1/water", { ml: 0 });
  check("ml=0 rejected (400)", bad.status === 400, `HTTP ${bad.status}`);
  const a = await actions(call, today);
  const fuel = await call("GET", "/v1/fuel/today");
  check("actions hydration.loggedMl=1000", a.hydration?.loggedMl === 1000, JSON.stringify(a.hydration));
  check("fuel/today hydration.loggedMl=1000", fuel.json?.hydration?.loggedMl === 1000, JSON.stringify(fuel.json?.hydration));
  check("target = 76kg*35 rounded to 250 = 2750", a.hydration?.targetMl === 2750, `target=${a.hydration?.targetMl}`);
  const w = goal(a, "water");
  check("water goal pending, metric 1/2.8L-ish", w?.status === "pending" && w.metric?.current === 1, JSON.stringify(w?.metric));
  // Other day is independent.
  const other = await call("GET", `/v1/today/actions?date=${PAST_DATE}`);
  check("other date has 0 water", other.json?.hydration?.loggedMl === 0, JSON.stringify(other.json?.hydration));
  // Reach target -> done.
  await call("POST", "/v1/water", { ml: 1750 });
  const full = await actions(call, today);
  check("water done at target", goal(full, "water")?.status === "done", `status=${goal(full, "water")?.status}`);
  summary.push(["A7", `actions=${a.hydration?.loggedMl} fuel=${fuel.json?.hydration?.loggedMl} target=${a.hydration?.targetMl}`]);
};

const a9 = async () => {
  const call = client(`ta-a9-${runId}`);
  const check = checker("A9 LOW_READINESS");
  const plan = await ensurePlanWithLift(call, today);
  const { workout } = planWorkoutToday(plan);
  check("plan has a workout today", Boolean(workout));
  if (!workout) return;
  const before = await actions(call, today);
  const res = await call("POST", "/v1/check-ins", { localDate: today, status: "low_sleep" });
  check("POST low_sleep check-in -> 201", res.status === 201, `HTTP ${res.status}`);
  const a = await actions(call, today);
  check("scenario=LOW_READINESS", a.scenario === "LOW_READINESS", `scenario=${a.scenario}`);
  check("workout skipped", goal(a, "workout")?.status === "skipped", `before=${goal(before, "workout")?.status} after=${goal(a, "workout")?.status}`);
  check("checkin done", goal(a, "checkin")?.status === "done");
  check("next not workout/checkin (both resolved)", Boolean(a.next) ? !["workout", "checkin"].includes(a.next.kind) : true, `next=${a.next?.kind ?? "null"}`);
  check("next.goalId not the skipped workout", a.next?.goalId !== goal(a, "workout")?.id);
  summary.push(["A9", `scenario=${a.scenario} workout=${goal(a, "workout")?.status} next=${a.next?.kind ?? "null"}`]);
};

const a10 = async () => {
  const call = client(`ta-a10-${runId}`);
  const check = checker("A10 no plan");
  const res = await call("GET", "/v1/today/actions");
  check("200 (no throw)", res.status === 200, `HTTP ${res.status} ${snippet(res.text, 120)}`);
  const a = res.json ?? {};
  check("goals has no workout", Array.isArray(a.goals) && !a.goals.some((g) => g.kind === "workout"), (a.goals ?? []).map((g) => g.kind).join(","));
  check("still has checkin + protein", ["checkin", "protein"].every((k) => (a.goals ?? []).some((g) => g.kind === k)));
  check("macros has 4 meters", a.macros?.length === 4);
  check("hydration default target 3000", a.hydration?.targetMl === 3000, JSON.stringify(a.hydration));
  check("next is non-null with a CTA", Boolean(a.next?.ctaLabel), snippet(a.next?.reason));
  summary.push(["A10", `goals=${(a.goals ?? []).map((g) => g.kind).join(",")} next=${a.next?.kind}`]);
};

const run = async () => {
  console.log(`Smoke today-actions: ${base} run=${runId} today=${today}`);
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  record("health", health?.ok === true);
  const probe = await client(`ta-probe-${runId}`)("GET", "/v1/today/actions");
  record("route registered (not 404)", probe.status !== 404, `HTTP ${probe.status}`);
  for (const fn of [a1, a2, a3, a4, a5a8, a6, a7, a9, a10]) {
    try {
      await fn();
    } catch (err) {
      record(`${fn.name} threw`, false, String(err));
    }
  }
  console.log("\nSnippets:");
  for (const [id, text] of summary) console.log(`- ${id}: ${snippet(text, 200)}`);
};

run()
  .catch((err) => record("unexpected error", false, String(err)))
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  });
