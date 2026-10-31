#!/usr/bin/env node
/**
 * Smoke test the accountability coach: OVER_KCAL, UNDER_PROTEIN, MISSED_LIFT, ON_TRACK,
 * STREAK_BREAK, UNDER_EATING, LOW_READINESS.
 * For each scenario: seed via API, GET /v1/insights/today, POST /v1/coach/advise, assert.
 *
 * Usage: node scripts/smoke-accountability.mjs
 * Env:   API_BASE_URL (default http://127.0.0.1:8787)
 *        SMOKE_RUN_ID (default random) - suffix for the per-scenario user ids
 * Needs ALLOW_DEV_USER_HEADER=true on the API.
 *
 * Time-of-day rules use the UTC hour (>=15 protein, >=19 lift). To stay deterministic
 * at any hour, UNDER_PROTEIN, MISSED_LIFT, STREAK_BREAK, UNDER_EATING and LOW_READINESS run against a PAST date (day over = hour 24).
 * OVER_KCAL and ON_TRACK run on today. Every run uses fresh users (acct-<scn>-<runId>).
 * Advise may be OpenAI or heuristic; assertions accept either, source is printed.
 */
const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const runId = process.env.SMOKE_RUN_ID ?? Math.random().toString(36).slice(2, 8);

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = iso(Date.now());
const yesterday = iso(Date.now() - DAY_MS);
/** Noon UTC on a YYYY-MM-DD date, in ms. */
const noonMs = (date) => Date.parse(`${date}T12:00:00.000Z`);

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

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

/** Number appears in text, with or without thousands separator. */
const cites = (text, n) => {
  const plain = String(Math.abs(Math.round(n)));
  const comma = Number(plain).toLocaleString("en-US");
  return text.includes(plain) || text.includes(comma);
};
const wordCount = (s) => s.trim().split(/\s+/).length;

const assertions = (scenario) => {
  const check = (name, ok, detail = "") => record(`${scenario} :: ${name}`, Boolean(ok), detail);
  return check;
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

const fetchBoth = async (call, date, adviseExtra = {}) => {
  const insights = await call("GET", `/v1/insights/today?date=${date}`);
  const advise = await call("POST", "/v1/coach/advise", { localDate: date, ...adviseExtra });
  return { insights, advise };
};

const snippet = (s, n = 140) => (s ?? "").replace(/\s+/g, " ").slice(0, n);

const baseChecks = (check, { insights, advise }) => {
  check("insights 200", insights.status === 200, `HTTP ${insights.status} ${insights.text.slice(0, 120)}`);
  check("advise 200", advise.status === 200, `HTTP ${advise.status} ${advise.text.slice(0, 120)}`);
  check(
    "advise message <= 60 words",
    typeof advise.json?.message === "string" && wordCount(advise.json.message) <= 60,
    `${wordCount(advise.json?.message ?? "")} words`,
  );
  check(
    "insights and advise agree on scenario",
    insights.json?.scenario === advise.json?.scenario,
    `${insights.json?.scenario} vs ${advise.json?.scenario}`,
  );
};

// ---------------------------------------------------------------------------

const overKcal = async () => {
  const call = client(`acct-over-${runId}`);
  const check = assertions("OVER_KCAL");
  await logMeal(call, "Big breakfast", "breakfast", 900, 40);
  await logMeal(call, "Big lunch", "lunch", 900, 40);
  await logMeal(call, "Big dinner", "dinner", 840, 30);
  const res = await fetchBoth(call, today);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  const target = i.fuel?.kcalTarget;
  const logged = i.fuel?.kcalLogged;
  const delta = i.fuel?.kcalDelta;
  check("scenario=OVER_KCAL", i.scenario === "OVER_KCAL", `scenario=${i.scenario}`);
  check("fuel.kcalDelta = logged - target > 0", logged === 2640 && delta === logged - target && delta > 0, `logged=${logged} target=${target} delta=${delta}`);
  check("harsh=true", i.harsh === true);
  check("briefing says OVER", /OVER/.test(i.briefing ?? ""), snippet(i.briefing));
  const tip = i.accountabilityTip ?? "";
  check("accountabilityTip cites logged, target and overage", cites(tip, logged) && cites(tip, target) && cites(tip, delta), snippet(tip));
  check("tips[0] is the call-out", i.tips?.[0] === tip);
  check("win does not celebrate fuel", !/fuel on target|right direction/i.test(i.win ?? ""), `win=${i.win}`);
  const msg = advise.json?.message ?? "";
  check("coach scenario=OVER_KCAL", advise.json?.scenario === "OVER_KCAL");
  check("coach cites logged AND target (or overage)", (cites(msg, logged) && cites(msg, target)) || cites(msg, delta), `[${advise.json?.source}] ${snippet(msg)}`);
  check("coach has a next action", /protein|walk|next meal|tomorrow/i.test(msg), snippet(msg));
  return { scenario: "OVER_KCAL", tip, msg, source: advise.json?.source };
};

const underProtein = async () => {
  const call = client(`acct-prot-${runId}`);
  const check = assertions("UNDER_PROTEIN");
  const at = noonMs(yesterday);
  await logMeal(call, "Carb breakfast", "breakfast", 700, 12, at - 4 * 3600_000);
  await logMeal(call, "Pasta lunch", "lunch", 700, 14, at);
  await logMeal(call, "Pizza dinner", "dinner", 600, 14, at + 6 * 3600_000);
  const res = await fetchBoth(call, yesterday);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  const f = i.fuel ?? {};
  check("scenario=UNDER_PROTEIN", i.scenario === "UNDER_PROTEIN", `scenario=${i.scenario}`);
  check("kcal near target (not over)", f.kcalDelta <= 0 && f.kcalLogged === 2000, `logged=${f.kcalLogged} delta=${f.kcalDelta}`);
  const tip = i.accountabilityTip ?? "";
  const short = Math.round(f.proteinGTarget - f.proteinGLogged);
  check("tip mentions protein and cites logged/target/short", /protein/i.test(tip) && cites(tip, f.proteinGLogged) && cites(tip, f.proteinGTarget) && cites(tip, short), snippet(tip));
  const msg = advise.json?.message ?? "";
  check("coach scenario=UNDER_PROTEIN", advise.json?.scenario === "UNDER_PROTEIN");
  check("coach message mentions protein short", /protein/i.test(msg) && (/short/i.test(msg) || cites(msg, short)), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "UNDER_PROTEIN", tip, msg, source: advise.json?.source };
};

/** Poll plan generation, then return the current plan. */
const ensurePlan = async (call) => {
  await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym"],
      trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45,
      cuisineStyles: ["other"],
    },
  });
  const gen = await call("POST", "/v1/plans/generate", {});
  const jobId = gen.json?.jobId;
  for (let i = 0; jobId && i < 45; i++) {
    const job = (await call("GET", `/v1/plans/jobs/${jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return (await call("GET", "/v1/plans/current")).json;
};

const missedLift = async () => {
  const call = client(`acct-miss-${runId}`);
  const check = assertions("MISSED_LIFT");
  const plan = await ensurePlan(call);
  const workoutsById = new Map((plan?.workouts ?? []).map((w) => [w.id, w]));
  // Latest plan day strictly before today that has a lift.
  const pastLift = (plan?.days ?? [])
    .filter((d) => d.workoutId && d.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  check("plan has a past lift day to miss", Boolean(pastLift), `weekStart=${plan?.plan?.weekStart} days=${(plan?.days ?? []).map((d) => `${d.date}${d.workoutId ? "*" : ""}`).join(",")}`);
  if (!pastLift) return { scenario: "MISSED_LIFT", tip: "", msg: "", source: "-" };
  const title = workoutsById.get(pastLift.workoutId)?.title ?? "";
  // On-target fuel so nothing outranks the missed lift.
  const target = plan.plan.summary.kcalTarget;
  const protein = plan.plan.summary.proteinG;
  const at = noonMs(pastLift.date);
  await logMeal(call, "Meal A", "breakfast", Math.round(target / 2), Math.round(protein / 2), at - 3 * 3600_000);
  await logMeal(call, "Meal B", "dinner", Math.round(target / 2), Math.round(protein / 2), at + 6 * 3600_000);
  const res = await fetchBoth(call, pastLift.date);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  check("scenario=MISSED_LIFT", i.scenario === "MISSED_LIFT", `scenario=${i.scenario} date=${pastLift.date}`);
  check("harsh=true", i.harsh === true);
  const tip = i.accountabilityTip ?? "";
  check("tip names the workout and says not logged / skipped", tip.includes(title) && /not logged|skipped|missed/i.test(tip), snippet(tip));
  const msg = advise.json?.message ?? "";
  check("coach scenario=MISSED_LIFT", advise.json?.scenario === "MISSED_LIFT");
  check("coach message cites lift, tomorrow or missed", /tomorrow|missed|skipped|lift|session/i.test(msg) && (msg.includes(title) || /missed|tomorrow/i.test(msg)), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "MISSED_LIFT", tip, msg, source: advise.json?.source };
};

const onTrack = async () => {
  const call = client(`acct-ok-${runId}`);
  const check = assertions("ON_TRACK");
  await logMeal(call, "Meal A", "breakfast", 650, 45);
  await logMeal(call, "Meal B", "lunch", 650, 45);
  await logMeal(call, "Meal C", "dinner", 650, 40);
  const res = await fetchBoth(call, today);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  check("scenario=ON_TRACK", i.scenario === "ON_TRACK", `scenario=${i.scenario}`);
  check("harsh=false, no accountabilityTip", i.harsh === false && i.accountabilityTip == null, `harsh=${i.harsh}`);
  check("briefing not OVER", !/OVER/.test(i.briefing ?? ""), snippet(i.briefing));
  check("kcalDelta within band", Math.abs(i.fuel?.kcalDelta) <= 100, `delta=${i.fuel?.kcalDelta}`);
  const msg = advise.json?.message ?? "";
  check("coach scenario=ON_TRACK", advise.json?.scenario === "ON_TRACK");
  check("coach message not falsely over on kcal / short", !/over by \d|over(?: on)? (?:kcal|calories|fuel)|over target|over your (?:kcal|calorie)|overage|junk|missed|short on/i.test(msg), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "ON_TRACK", tip: i.briefing, msg, source: advise.json?.source };
};

/** POST a check-in for a (past) local date. */
const checkIn = async (call, localDate, status) => {
  const res = await call("POST", "/v1/check-ins", { localDate, status });
  if (res.status !== 201) throw new Error(`check-in POST failed: ${res.status} ${res.text}`);
};

/** On-target fuel on `date` so only the behavior under test fires. */
const logOnTargetDay = async (call, date) => {
  const at = noonMs(date);
  await logMeal(call, "Meal A", "breakfast", 700, 40, at - 4 * 3600_000);
  await logMeal(call, "Meal B", "lunch", 650, 40, at);
  await logMeal(call, "Meal C", "dinner", 650, 40, at + 6 * 3600_000);
};

const streakBreak = async () => {
  const call = client(`acct-streak-${runId}`);
  const check = assertions("STREAK_BREAK");
  // 3-day check-in streak (D-4..D-2), then nothing on D-1 or D (D = test date).
  // Test date = yesterday (day over, hour 24), so the result does not depend on the hour.
  const date = yesterday;
  const prior = [2, 3, 4].map((n) => iso(noonMs(date) - n * DAY_MS));
  for (const d of prior) await checkIn(call, d, "done");
  await logOnTargetDay(call, date);
  const res = await fetchBoth(call, date);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  check("scenario=STREAK_BREAK", i.scenario === "STREAK_BREAK", `scenario=${i.scenario} date=${date} prior=${prior.join(",")}`);
  check("harsh=true", i.harsh === true);
  const tip = i.accountabilityTip ?? "";
  check("tip cites streak and its length (3)", /streak/i.test(tip) && /\b3\b/.test(tip), snippet(tip));
  check("history.streakDays reset to 0", i.history?.streakDays === 0, `streakDays=${i.history?.streakDays}`);
  const msg = advise.json?.message ?? "";
  check("coach scenario=STREAK_BREAK", advise.json?.scenario === "STREAK_BREAK");
  check("coach message cites streak / check-in / missed", /streak|check.?in|missed/i.test(msg), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "STREAK_BREAK", tip, msg, source: advise.json?.source };
};

const underEating = async () => {
  const call = client(`acct-under-${runId}`);
  const check = assertions("UNDER_EATING");
  const at = noonMs(yesterday);
  // 600 kcal (30% of the 2000 default) but protein on target, so UNDER_PROTEIN cannot outrank.
  await logMeal(call, "Shake A", "breakfast", 200, 40, at - 4 * 3600_000);
  await logMeal(call, "Shake B", "lunch", 200, 40, at);
  await logMeal(call, "Shake C", "dinner", 200, 40, at + 6 * 3600_000);
  const res = await fetchBoth(call, yesterday);
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  const f = i.fuel ?? {};
  check("scenario=UNDER_EATING", i.scenario === "UNDER_EATING", `scenario=${i.scenario}`);
  check("kcal < 50% of target", f.kcalLogged < f.kcalTarget * 0.5, `logged=${f.kcalLogged} target=${f.kcalTarget}`);
  check("harsh=true", i.harsh === true);
  const tip = i.accountabilityTip ?? "";
  check("tip cites logged and target kcal and says eat", cites(tip, f.kcalLogged) && cites(tip, f.kcalTarget) && /eat|under-eating/i.test(tip), snippet(tip));
  const msg = advise.json?.message ?? "";
  check("coach scenario=UNDER_EATING", advise.json?.scenario === "UNDER_EATING");
  check("coach cites low kcal (logged or target) and eat", (cites(msg, f.kcalLogged) || cites(msg, f.kcalTarget)) && /eat|under-eating|fuel/i.test(msg), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "UNDER_EATING", tip, msg, source: advise.json?.source };
};

const lowReadiness = async () => {
  const call = client(`acct-ready-${runId}`);
  const check = assertions("LOW_READINESS");
  const date = yesterday;
  const at = noonMs(date);
  // Over on kcal (2640) with protein on target: OVER_KCAL must come out as secondary.
  await logMeal(call, "Big breakfast", "breakfast", 900, 45, at - 4 * 3600_000);
  await logMeal(call, "Big lunch", "lunch", 900, 45, at);
  await logMeal(call, "Big dinner", "dinner", 840, 40, at + 6 * 3600_000);
  await checkIn(call, date, "low_sleep");
  const res = await fetchBoth(call, date, { status: "low_sleep" });
  const { insights, advise } = res;
  baseChecks(check, res);
  const i = insights.json ?? {};
  check("scenario=LOW_READINESS (primary)", i.scenario === "LOW_READINESS", `scenario=${i.scenario}`);
  check("secondary includes OVER_KCAL", (i.secondaryScenarios ?? []).includes("OVER_KCAL"), `secondary=${(i.secondaryScenarios ?? []).join(",")}`);
  const tip = i.accountabilityTip ?? "";
  check("tip cites the low-sleep check-in and volume", /low sleep/i.test(tip) && /volume/i.test(tip), snippet(tip));
  check("tips include the over-kcal call-out as secondary", (i.tips ?? []).some((t) => /OVER by/.test(t)), snippet((i.tips ?? []).join(" | ")));
  const msg = advise.json?.message ?? "";
  check("coach scenario=LOW_READINESS", advise.json?.scenario === "LOW_READINESS");
  check("coach message cites volume/recovery/sleep", /volume|recover|sleep|rest/i.test(msg), `[${advise.json?.source}] ${snippet(msg)}`);
  check("coach message also cites kcal overage (secondary)", /kcal|over|2,?640/i.test(msg), `[${advise.json?.source}] ${snippet(msg)}`);
  return { scenario: "LOW_READINESS", tip, msg, source: advise.json?.source };
};

const run = async () => {
  console.log(`Smoke accountability: ${base} run=${runId} today=${today} yesterday=${yesterday}`);
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  record("health", health?.ok === true);
  const summary = [];
  for (const fn of [overKcal, underProtein, missedLift, onTrack, streakBreak, underEating, lowReadiness]) {
    try {
      summary.push(await fn());
    } catch (err) {
      record(`${fn.name} threw`, false, String(err));
    }
  }
  console.log("\nSnippets:");
  for (const s of summary) {
    console.log(`- ${s.scenario} [${s.source}]\n    tip/brief: ${snippet(s.tip, 220)}\n    coach:     ${snippet(s.msg, 220)}`);
  }
};

run()
  .catch((err) => record("unexpected error", false, String(err)))
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  });
