#!/usr/bin/env node
/**
 * Smoke: POST /v1/coach/revise (plan chat).
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-plan-chat.mjs
 * Uses a fresh dev user (x-mirra-user-id), so ALLOW_DEV_USER_HEADER must be true.
 * Covers: no cable -> workout changes, dryRun no persist, no dairy -> meal regen, empty message 400.
 */
const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const USER = process.env.SMOKE_USER ?? `smoke-plan-chat-${Date.now()}`;
const CABLE_RE = /cable|pulldown|face pull|pushdown|crossover/i;
const needsCable = (name) => CABLE_RE.test(name) && !/band|dumbbell/i.test(name);
/** True dairy names — plant milks (soy/oat/almond…) are dairy-free substitutes. */
const PLANT_MILK_RE = /\b(soy|oat|almond|rice|coconut|cashew|hemp|pea)\s*milk\b/i;
const looksLikeDairy = (name) => {
  if (PLANT_MILK_RE.test(name)) return false;
  return /\b(milk|cheese|yogurt|yoghurt|paneer|whey|butter|cottage|kefir)\b/i.test(name);
};

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": USER },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const revise = (body) => call("POST", "/v1/coach/revise", body);
const names = (workout) => workout.exercises.map((e) => e.name);

const setup = async () => {
  const onboard = await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym", "dumbbells", "cables", "machines"],
      trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45,
      dietTags: [],
      foodsAvoid: null,
      cuisineStyles: ["other"],
      units: "metric",
    },
  });
  check(onboard.status === 200, "onboarding", `status ${onboard.status}`);
  const gen = await call("POST", "/v1/plans/generate", {});
  check(gen.status === 201, "plan generate queued", `status ${gen.status}`);
  for (let i = 0; i < 40; i += 1) {
    const job = await call("GET", `/v1/plans/jobs/${gen.json.jobId}`);
    if (["done", "succeeded"].includes(job.json?.status)) return;
    if (job.json?.status === "failed") throw new Error(`plan job failed: ${job.json.error}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("plan job timed out");
};

const main = async () => {
  console.log(`API ${BASE} user ${USER}`);
  await setup();

  const empty = await revise({ message: "" });
  check(empty.status === 400, "empty message -> 400", `status ${empty.status}`);
  const blank = await revise({ message: "   " });
  check(blank.status === 400, "whitespace message -> 400", `status ${blank.status}`);

  const current = (await call("GET", "/v1/plans/current")).json;
  const target =
    current.workouts.find((w) => w.exercises.some((e) => CABLE_RE.test(e.name))) ?? current.workouts[0];
  check(Boolean(target), "plan has a workout", target?.title);
  const before = names(target);
  const context = { workoutId: target.id };

  // dryRun: described, not persisted.
  const dry = await revise({ message: "no cable machines", dryRun: true, context });
  check(dry.status === 200 && dry.json.applied === false, "dryRun applied=false", JSON.stringify(dry.json?.changes));
  const afterDry = (await call("GET", "/v1/plans/current")).json.workouts.find((w) => w.id === target.id);
  check(JSON.stringify(names(afterDry)) === JSON.stringify(before), "dryRun left exercises unchanged");
  const prefsDry = (await call("GET", "/v1/me")).json.preferences;
  check(prefsDry?.equipment?.includes("cables"), "dryRun left equipment unchanged", String(prefsDry?.equipment));

  // Real: no cable -> prefs and/or workout swaps (OpenAI plans may already have zero cable moves).
  const real = await revise({ message: "no cable machines", context });
  const changeKinds = (real.json?.changes ?? []).map((c) => c.kind);
  const workoutChanges = (real.json?.changes ?? []).filter((c) => c.kind.startsWith("workout_"));
  const equipmentChange = changeKinds.includes("equipment");
  check(real.status === 200 && real.json.applied === true, "no cable applied=true", real.json?.message);
  check(
    workoutChanges.length > 0 || equipmentChange,
    "no cable -> workout or equipment change",
    (real.json?.changes ?? []).map((c) => c.summary).join(" | "),
  );
  const afterReal = (await call("GET", "/v1/plans/current")).json.workouts.find((w) => w.id === target.id);
  check(!names(afterReal).some(needsCable), "no cable exercises remain", names(afterReal).join(", "));
  const prefsReal = (await call("GET", "/v1/me")).json.preferences;
  check(!prefsReal.equipment.includes("cables"), "equipment drops cables", prefsReal.equipment.join(","));

  // No dairy -> meal regen.
  await call("POST", "/v1/meal-plan/generate", {});
  const dairy = await revise({ message: "no dairy please", scope: "meal" });
  const regen = (dairy.json?.changes ?? []).some((c) => c.kind === "meal_regen");
  check(dairy.status === 200 && regen, "no dairy -> meal regen", JSON.stringify(dairy.json?.changes));
  const items = (dairy.json?.mealPlan?.meals ?? []).flatMap((m) => m.items.map((i) => i.name));
  check(items.length > 0 && !items.some(looksLikeDairy), "meal plan has no dairy", items.join(", "));
  const prefsFood = (await call("GET", "/v1/me")).json.preferences;
  check(/dairy/i.test(prefsFood.foodsAvoid ?? ""), "foodsAvoid persisted", prefsFood.foodsAvoid ?? "");

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
