#!/usr/bin/env node
/**
 * Smoke: user CRUD (no AI) for meals, planned meals and plan exercises.
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-user-crud.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (fresh x-mirra-user-id per run).
 *
 * M  onboard -> POST meal -> PATCH -> GET list -> other user 404 -> DELETE -> DELETE again 404
 * P  create planned item -> PATCH -> log -> delete logged meal (item returns to planned) -> DELETE
 * W  plan generate (wait) -> POST exercise -> PATCH -> DELETE -> DELETE again 404 -> other user 404
 */
const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const RUN = Date.now();
const USER = process.env.SMOKE_USER ?? `smoke-user-crud-${RUN}`;
const OTHER = `${USER}-other`;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const callAs = async (user, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const call = (method, path, body) => callAs(USER, method, path, body);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const onboard = (user) =>
  callAs(user, "PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, goalWeightKg: 74, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym", "dumbbells"],
      trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45,
      dietTags: [],
      foodsAvoid: null,
      cuisineStyles: ["other"],
      units: "metric",
    },
  });

const waitForPlan = async () => {
  const gen = await call("POST", "/v1/plans/generate", {});
  check(gen.status === 201, "plan generate queued", `status ${gen.status}`);
  for (let i = 0; i < 60; i += 1) {
    const job = await call("GET", `/v1/plans/jobs/${gen.json.jobId}`);
    if (["done", "succeeded"].includes(job.json?.status)) return true;
    if (job.json?.status === "failed") throw new Error(`plan job failed: ${job.json.error}`);
    await sleep(1500);
  }
  throw new Error("plan job timed out");
};

const testMeals = async () => {
  const created = await call("POST", "/v1/meals", {
    name: "Smoke oats", mealSlot: "breakfast", kcal: 400, proteinG: 20, carbsG: 50, fatG: 10,
  });
  check(created.status === 201 && created.json?.id, "M POST meal -> 201", `status ${created.status}`);
  const id = created.json?.id;

  const patched = await call("PATCH", `/v1/meals/${id}`, { name: "Smoke oats+", kcal: 450, slot: "lunch", proteinG: 25 });
  check(
    patched.status === 200 && patched.json?.name === "Smoke oats+" && patched.json?.kcal === 450 &&
      patched.json?.mealSlot === "lunch" && patched.json?.proteinG === 25 && patched.json?.carbsG === 50,
    "M PATCH meal -> partial update kept other fields",
    JSON.stringify(patched.json),
  );
  const empty = await call("PATCH", `/v1/meals/${id}`, {});
  check(empty.status === 400, "M PATCH empty body -> 400", `status ${empty.status}`);

  const list = await call("GET", "/v1/meals");
  const found = list.json?.items?.find((m) => m.id === id);
  check(found?.kcal === 450 && found?.name === "Smoke oats+", "M GET /v1/meals shows edit");

  const otherPatch = await callAs(OTHER, "PATCH", `/v1/meals/${id}`, { kcal: 1 });
  const otherDelete = await callAs(OTHER, "DELETE", `/v1/meals/${id}`);
  check(otherPatch.status === 404 && otherDelete.status === 404, "M other user PATCH/DELETE -> 404", `${otherPatch.status}/${otherDelete.status}`);

  const del = await call("DELETE", `/v1/meals/${id}`);
  check(del.status === 200 && del.json?.ok === true, "M DELETE meal -> 200", `status ${del.status}`);
  const again = await call("DELETE", `/v1/meals/${id}`);
  const patchGone = await call("PATCH", `/v1/meals/${id}`, { kcal: 1 });
  check(again.status === 404 && patchGone.status === 404, "M DELETE/PATCH after delete -> 404", `${again.status}/${patchGone.status}`);
  const after = await call("GET", "/v1/meals");
  check(!after.json?.items?.some((m) => m.id === id), "M GET /v1/meals no longer lists it");
};

const testPlannedItems = async () => {
  const localDate = new Date().toISOString().slice(0, 10);
  const created = await call("POST", "/v1/meal-plan/items", {
    localDate, slot: "snack", name: "Smoke shake", kcal: 300, proteinG: 30, carbsG: 20, fatG: 5, grams: 250,
  });
  const item = created.json?.item;
  check(
    created.status === 201 && item?.title === "Smoke shake" && item?.status === "planned" && item?.items?.length === 1,
    "P POST item -> 201 planned",
    `status ${created.status}`,
  );
  check(created.json?.plan?.meals?.some((m) => m.id === item?.id), "P plan includes new item");

  const bad = await call("POST", "/v1/meal-plan/items", { localDate: "nope", slot: "snack", name: "x", kcal: 1, proteinG: 1 });
  check(bad.status === 400, "P POST invalid -> 400", `status ${bad.status}`);

  const patched = await call("PATCH", `/v1/meal-plan/items/${item?.id}`, { name: "Smoke shake+", kcal: 350, proteinG: 35 });
  check(
    patched.status === 200 && patched.json?.item?.title === "Smoke shake+" && patched.json?.item?.kcal === 350 &&
      patched.json?.item?.items?.[0]?.kcal === 350,
    "P PATCH item -> row + line synced",
    JSON.stringify(patched.json?.item),
  );

  const otherPatch = await callAs(OTHER, "PATCH", `/v1/meal-plan/items/${item?.id}`, { kcal: 1 });
  const otherDelete = await callAs(OTHER, "DELETE", `/v1/meal-plan/items/${item?.id}`);
  check(otherPatch.status === 404 && otherDelete.status === 404, "P other user PATCH/DELETE -> 404", `${otherPatch.status}/${otherDelete.status}`);

  const plan = await call("GET", `/v1/meal-plan/today?date=${localDate}`);
  check(plan.json?.plan?.meals?.some((m) => m.id === item?.id && m.kcal === 350), "P GET today shows edit");

  // Logged planned meal: not deletable here; deleting the logged meal re-opens it.
  const logged = await call("POST", `/v1/meal-plan/${created.json?.plan?.id}/log`, { mealItemId: item?.id });
  check(logged.status === 201, "P log item -> 201", `status ${logged.status}`);
  const blocked = await call("DELETE", `/v1/meal-plan/items/${item?.id}`);
  check(blocked.status === 409, "P DELETE logged item -> 409", `status ${blocked.status}`);
  await call("DELETE", `/v1/meals/${logged.json?.meal?.id}`);
  const reopened = await call("GET", `/v1/meal-plan/today?date=${localDate}`);
  check(
    reopened.json?.plan?.meals?.find((m) => m.id === item?.id)?.status === "planned",
    "P deleting logged meal re-opens planned item",
  );

  const del = await call("DELETE", `/v1/meal-plan/items/${item?.id}`);
  check(del.status === 200 && !del.json?.plan?.meals?.some((m) => m.id === item?.id), "P DELETE item -> 200, gone from plan", `status ${del.status}`);
  const again = await call("DELETE", `/v1/meal-plan/items/${item?.id}`);
  check(again.status === 404, "P DELETE again -> 404", `status ${again.status}`);
};

const testExercises = async () => {
  const current = (await call("GET", "/v1/plans/current")).json;
  const workout = current?.workouts?.[0];
  check(Boolean(workout), "W plan has a workout", workout?.title);
  const base = `/v1/workouts/${workout.id}/exercises`;
  const before = workout.exercises.length;

  const created = await call("POST", base, { name: "Smoke curl", targetSets: 3, targetReps: "10-12", restSec: 60, cue: "Slow negatives" });
  const ex = created.json;
  check(
    created.status === 201 && ex?.name === "Smoke curl" && ex?.targetReps === "10-12" && ex?.restSec === 60,
    "W POST exercise -> 201",
    `status ${created.status}`,
  );
  const numeric = await call("POST", base, { name: "Smoke num", targetSets: 2, targetReps: 8 });
  check(numeric.status === 201 && numeric.json?.targetReps === "8", "W POST numeric reps -> stored as text", `status ${numeric.status}`);
  const bad = await call("POST", base, { name: "", targetSets: 0, targetReps: "x" });
  check(bad.status === 400, "W POST invalid -> 400", `status ${bad.status}`);

  const patched = await call("PATCH", `${base}/${ex?.id}`, { targetSets: 4, restSec: null, cue: "Squeeze" });
  check(
    patched.status === 200 && patched.json?.targetSets === 4 && patched.json?.restSec === null &&
      patched.json?.cue === "Squeeze" && patched.json?.name === "Smoke curl",
    "W PATCH exercise -> partial update",
    JSON.stringify(patched.json),
  );

  const otherPatch = await callAs(OTHER, "PATCH", `${base}/${ex?.id}`, { targetSets: 9 });
  const otherPost = await callAs(OTHER, "POST", base, { name: "Nope", targetSets: 1, targetReps: "1" });
  check(otherPatch.status === 404 && otherPost.status === 404, "W other user PATCH/POST -> 404", `${otherPatch.status}/${otherPost.status}`);

  const afterAdd = (await call("GET", "/v1/plans/current")).json?.workouts?.find((w) => w.id === workout.id);
  check(
    afterAdd?.exercises?.length === before + 2 && afterAdd.exercises.at(-2)?.id === ex?.id,
    "W GET /v1/plans/current lists new exercises last",
    `${before} -> ${afterAdd?.exercises?.length}`,
  );

  const del = await call("DELETE", `${base}/${ex?.id}`);
  await call("DELETE", `${base}/${numeric.json?.id}`);
  check(del.status === 200 && del.json?.ok === true, "W DELETE exercise -> 200", `status ${del.status}`);
  const again = await call("DELETE", `${base}/${ex?.id}`);
  check(again.status === 404, "W DELETE again -> 404", `status ${again.status}`);
  const final = (await call("GET", "/v1/plans/current")).json?.workouts?.find((w) => w.id === workout.id);
  check(final?.exercises?.length === before, "W exercise count restored", String(final?.exercises?.length));
};

const main = async () => {
  console.log(`API ${BASE} user ${USER}`);
  const a = await onboard(USER);
  const b = await onboard(OTHER);
  check(a.status === 200 && b.status === 200, "onboard both users -> 200", `${a.status}/${b.status}`);
  await testMeals();
  // Planned items need an active plan (day targets); exercises need one too.
  await waitForPlan();
  await testPlannedItems();
  await testExercises();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
