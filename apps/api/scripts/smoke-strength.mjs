#!/usr/bin/env node
/**
 * Smoke: strength engine (AMI-165). Needs `wrangler dev` with local migrations applied.
 *   API_BASE=http://127.0.0.1:8793 node scripts/smoke-strength.mjs
 */
const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
let failures = 0;

const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const call = async (user, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const onboard = (user) =>
  call(user, "PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 180, weightKg: 80, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle", experience: "y3_plus", equipment: ["full_gym"], trainDays: [1, 2, 3, 4, 5],
      sessionMinutes: 60, cuisineStyles: ["other"], foodsAvoid: null,
    },
  });

const generatePlan = async (user) => {
  const { json } = await call(user, "POST", "/v1/plans/generate", {});
  for (let i = 0; i < 30; i += 1) {
    const job = (await call(user, "GET", `/v1/plans/jobs/${json.jobId}`)).json;
    if (job?.status === "succeeded" || job?.status === "ready" || job?.planId) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return (await call(user, "GET", "/v1/plans/current")).json;
};

const runSession = async (user, workoutId, sets) => {
  const session = (await call(user, "POST", "/v1/workouts/sessions", { workoutId })).json;
  for (const [i, s] of sets.entries()) {
    await call(user, "POST", `/v1/workouts/sessions/${session.id}/sets`, { ...s, setIndex: i + 1, completed: true });
  }
  const t0 = Date.now();
  const done = await call(user, "POST", `/v1/workouts/sessions/${session.id}/complete`, { rpe: 8 });
  return { ...done, ms: Date.now() - t0 };
};

const short = (st) => (st ? `${st.label} (${st.pct})` : null);

const main = async () => {
  const u = `smoke-strength-${Date.now()}`;
  check((await onboard(u)).status === 200, "onboarded male 80 kg");
  const plan = await generatePlan(u);
  const workoutId = plan?.workouts?.[0]?.id;
  check(Boolean(workoutId), "plan generated", `${plan?.workouts?.length ?? 0} workouts`);

  const s1 = await runSession(u, workoutId, [
    { exerciseName: "Barbell Bench Press", weightKg: 40, reps: 10 },
    { exerciseName: "Barbell Bench Press", weightKg: 80, reps: 8 },
    { exerciseName: "Barbell Bench Press", weightKg: 80, reps: 8 },
    { exerciseName: "Back Squat", weightKg: 100, reps: 5 },
    { exerciseName: "Back Squat", weightKg: 100, reps: 5 },
    { exerciseName: "Pull-ups", weightKg: 0, reps: 10 },
    { exerciseName: "Pull-ups", weightKg: null, reps: 8 },
    { exerciseName: "Sled Push", weightKg: 60, reps: 10 },
  ]);
  check(s1.status === 200 && Array.isArray(s1.json?.tierChanges), "complete returns tierChanges", `${s1.ms} ms`);
  console.log("tierChanges #1", JSON.stringify(s1.json?.tierChanges?.map((c) => `${c.scope}:${c.refId} ${short(c.from)} → ${short(c.to)}`)));

  const overview = (await call(u, "GET", "/v1/strength")).json;
  const ranked = overview?.muscles?.filter((m) => m.standing).map((m) => `${m.id}=${m.standing.label}`);
  console.log("GET /v1/strength", JSON.stringify({ overall: overview?.overall, unlock: overview?.unlock, ranked, groups: overview?.groups?.map((g) => `${g.id}=${g.standing?.label ?? null}`) }));
  check(overview?.muscles?.find((m) => m.id === "chest")?.standing != null, "chest ranked");
  check(overview?.muscles?.find((m) => m.id === "abs")?.standing === null, "core unranked");
  check(overview?.overall === null && overview?.unlock?.ranked === 3, "overall locked, 3 ranked lifts");

  const chest = (await call(u, "GET", "/v1/strength/muscles/chest")).json;
  console.log("GET /v1/strength/muscles/chest", JSON.stringify({ standing: chest?.standing, next: chest?.next, contributors: chest?.contributors }));
  check(chest?.next?.display != null, "chest has a next-division set", chest?.next?.display);

  const bench = (await call(u, "GET", "/v1/strength/exercises/bench_press")).json;
  console.log("GET /v1/strength/exercises/bench_press", JSON.stringify({ standing: bench?.standing, next: bench?.next, bestSet: bench?.bestSet }));
  check(bench?.ranked === true && bench?.bestSet?.weightKg === 80, "bench ranked, best set 80 kg");

  const pull = (await call(u, "GET", "/v1/strength/exercises/pull_up")).json;
  console.log("GET /v1/strength/exercises/pull_up", JSON.stringify({ standing: short(pull?.standing), next: pull?.next?.display }));

  const sled = await call(u, "GET", "/v1/strength/exercises/tag:sled push");
  check(sled.status === 404 || sled.json?.ranked === false, "unknown lift never ranked", String(sled.status));
  check((await call(u, "GET", "/v1/strength/muscles/neck")).status === 404, "unknown muscle = 404");

  const s2 = await runSession(u, workoutId, [
    { exerciseName: "Barbell Bench Press", weightKg: 100, reps: 6 },
    { exerciseName: "Barbell Bench Press", weightKg: 100, reps: 5 },
  ]);
  console.log("tierChanges #2", JSON.stringify(s2.json?.tierChanges?.map((c) => `${c.scope}:${c.refId} ${short(c.from)} → ${short(c.to)}`)));
  check(s2.json?.tierChanges?.some((c) => c.scope === "exercise" && c.refId === "bench_press"), "heavier bench: exercise promotion", `${s2.ms} ms`);
  check(s2.json?.tierChanges?.some((c) => c.scope === "muscle" && c.refId === "chest"), "heavier bench: chest promotion");

  check((await fetch(`${BASE}/v1/strength`)).status === 401, "no auth = 401");
  if (failures > 0) {
    console.error(`${failures} FAILED`);
    process.exit(1);
  }
  console.log("PASS strength smoke");
};
main();
