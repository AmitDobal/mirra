#!/usr/bin/env node
/**
 * Smoke: plan-chat meal revise (AMI-153).
 *   API_BASE=http://127.0.0.1:8793 node scripts/smoke-meal-revise.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (x-mirra-user-id). Heuristic AI is fine.
 *
 * Covers: "I only eat two times a day" preview (real before/after, nothing written) ->
 * confirm with the previewed intent (free text deliberately garbage) -> 2 live slots ->
 * repeat = "already" coach message -> diet change keeps 2 slots -> exercise swap still works.
 */
import { execSync } from "node:child_process";

const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const USER = `smoke-meals-${Date.now()}`;
const TODAY = new Date().toISOString().slice(0, 10);
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
const live = (plan) => (plan?.meals ?? []).filter((m) => m.status !== "skipped");
const slotsOf = (plan) => live(plan).map((m) => m.slot).join(",");
const show = (label, v) => console.log(`      ${label}: ${JSON.stringify(v)}`);

const main = async () => {
  await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle", experience: "months", equipment: ["full_gym"], trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45, cuisineStyles: ["other"], foodsAvoid: null,
    },
  });
  // Local D1 only: the baseline POST /v1/meal-plan/generate route is Pro-gated.
  if (process.env.SMOKE_GRANT_PRO !== "0") {
    execSync(
      `npx wrangler d1 execute mirra-db --local --command "INSERT OR REPLACE INTO entitlements (user_id, status, updated_at) VALUES ('${USER}', 'active', ${Date.now()})"`,
      { stdio: "ignore" },
    );
  }
  const gen = await call("POST", "/v1/plans/generate", {});
  for (let i = 0; gen.json?.jobId && i < 60; i++) {
    const job = (await call("GET", `/v1/plans/jobs/${gen.json.jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const first = await call("POST", "/v1/meal-plan/generate", { date: TODAY, force: true });
  check(first.status === 200, "baseline meal plan generated", JSON.stringify(first.json).slice(0, 200));
  const baseSlots = slotsOf(first.json);
  check(live(first.json).length >= 3, "baseline has 3+ live slots", baseSlots);

  // 1. Preview
  const MSG = "I only eat two times a day";
  const prev = await call("POST", "/v1/coach/revise", { message: MSG, scope: "auto", date: TODAY, dryRun: true });
  show("preview.message", prev.json?.message);
  show("preview.changes", prev.json?.changes);
  check(prev.json?.applied === false, "preview does not apply");
  check(prev.json?.intent?.mealsPerDay === 2, "intent.mealsPerDay = 2");
  const kinds = (prev.json?.changes ?? []).map((c) => c.kind);
  check(kinds.includes("meals_per_day") && kinds.includes("meal_regen"), "preview has meals_per_day + meal_regen", kinds.join(","));
  check((prev.json?.changes ?? []).every((c) => c.before && c.after), "every change has before and after");
  const afterPreview = await call("GET", "/v1/meal-plan/today");
  check(slotsOf(afterPreview.json?.plan) === baseSlots, "preview wrote nothing", slotsOf(afterPreview.json?.plan));
  check((await call("GET", "/v1/me")).json?.preferences?.mealsPerDay == null, "pref still unset after preview");

  // 2. Confirm with the intent; free text is garbage on purpose (no re-parse).
  const applied = await call("POST", "/v1/coach/revise", {
    message: "yes", scope: "auto", date: TODAY, dryRun: false, intent: prev.json.intent,
  });
  show("apply.changes", applied.json?.changes);
  check(applied.json?.applied === true, "confirm applied (garbage text, intent only)");
  const today = await call("GET", "/v1/meal-plan/today");
  check(slotsOf(today.json?.plan) === "lunch,dinner", "plan now has exactly lunch + dinner", slotsOf(today.json?.plan));
  check((await call("GET", "/v1/me")).json?.preferences?.mealsPerDay === 2, "pref saved: mealsPerDay = 2");
  const regen = (applied.json?.changes ?? []).find((c) => c.kind === "meal_regen");
  check(Boolean(regen?.before && regen?.after && regen.before !== regen.after), "apply before/after differ (real meals)");

  // 3. Already at target
  const again = await call("POST", "/v1/coach/revise", { message: MSG, scope: "auto", date: TODAY, dryRun: true });
  show("again.message", again.json?.message);
  check((again.json?.changes ?? []).length === 0, "already at target: no changes");
  check(/already/i.test(again.json?.message ?? ""), "already-at-target coach message");
  const againApply = await call("POST", "/v1/coach/revise", { message: MSG, dryRun: false, date: TODAY, intent: prev.json.intent });
  check(againApply.json?.applied === false, "re-confirm of a stale preview applies nothing");

  // 4. Diet change keeps the 2-meal preference
  const dairyPrev = await call("POST", "/v1/coach/revise", { message: "no dairy please", scope: "auto", date: TODAY, dryRun: true });
  check((dairyPrev.json?.changes ?? []).length > 0, "dairy preview has changes");
  const dairy = await call("POST", "/v1/coach/revise", { message: "x", date: TODAY, dryRun: false, intent: dairyPrev.json.intent });
  check(dairy.json?.applied === true, "dairy applied");
  check(slotsOf((await call("GET", "/v1/meal-plan/today")).json?.plan) === "lunch,dinner", "still 2 slots after diet change");

  // 5. Exercise / equipment swap still works
  const gear = await call("POST", "/v1/coach/revise", { message: "no cable machines", scope: "auto", date: TODAY, dryRun: true });
  show("gear.changes", gear.json?.changes);
  check(gear.status === 200 && Array.isArray(gear.json?.changes), "workout preview ok");
  const gearApply = await call("POST", "/v1/coach/revise", { message: "x", date: TODAY, dryRun: false, intent: gear.json.intent });
  check(gearApply.status === 200 && gearApply.json?.applied === (gear.json.changes.length > 0), "workout confirm matches preview", `${gear.json.changes.length} changes`);

  // 6. Back to 3 meals
  const three = await call("POST", "/v1/coach/revise", { message: "make it 3 meals a day", scope: "auto", date: TODAY, dryRun: true });
  check(three.json?.intent?.mealsPerDay === 3, "3 meals parsed");
  await call("POST", "/v1/coach/revise", { message: "x", date: TODAY, dryRun: false, intent: three.json.intent });
  check(slotsOf((await call("GET", "/v1/meal-plan/today")).json?.plan) === "breakfast,lunch,dinner", "3 meals: breakfast,lunch,dinner");

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
