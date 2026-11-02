#!/usr/bin/env node
/**
 * Smoke: revise rate caps (AMI-159).
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-revise-caps.mjs
 * Needs ALLOW_DEV_USER_HEADER=true + local D1 (wrangler dev).
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const TODAY = new Date().toISOString().slice(0, 10);
let failures = 0;

const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const d1 = (sql) => {
  execSync(`npx wrangler d1 execute mirra-db --local --command ${JSON.stringify(sql)}`, { stdio: "pipe" });
};

const seedAudit = (userId, action, n) => {
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    d1(
      `INSERT INTO audit_log (id, user_id, action, meta_json, created_at) VALUES ('${randomUUID()}', '${userId}', '${action}', '{}', ${now})`,
    );
  }
};

const call = async (user, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const onboard = async (user) => {
  await call(user, "PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym"],
      trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45,
      cuisineStyles: ["other"],
      foodsAvoid: null,
    },
  });
  const gen = await call(user, "POST", "/v1/plans/generate", {});
  for (let i = 0; gen.json?.jobId && i < 60; i++) {
    const job = (await call(user, "GET", `/v1/plans/jobs/${gen.json.jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
};

const main = async () => {
  console.log(`API ${BASE}`);

  const planUser = `smoke-revise-cap-plan-${Date.now()}`;
  await onboard(planUser);
  seedAudit(planUser, "coach.revise", 4);

  const blocked = await call(planUser, "POST", "/v1/coach/revise", {
    message: "add dumbbells only",
    scope: "workout",
    date: TODAY,
    dryRun: false,
  });
  check(blocked.status === 429, "5th plan apply → 429", String(blocked.status));
  check(
    blocked.json?.message?.includes("Plan chat limit"),
    "plan 429 copy mentions Plan chat limit",
    blocked.json?.message,
  );

  const preview = await call(planUser, "POST", "/v1/coach/revise", {
    message: "add dumbbells only",
    scope: "workout",
    date: TODAY,
    dryRun: true,
  });
  check(preview.status === 200, "dryRun still works after 4 applies", String(preview.status));
  check(preview.json?.applied === false, "dryRun preview not applied");

  const mealUser = `smoke-revise-cap-meal-${Date.now()}`;
  await onboard(mealUser);
  d1(
    `INSERT OR REPLACE INTO entitlements (user_id, status, updated_at) VALUES ('${mealUser}', 'active', ${Date.now()})`,
  );
  seedAudit(mealUser, "meal_plan.generate", 2);

  const mealBlocked = await call(mealUser, "POST", "/v1/meal-plan/generate", { date: TODAY, force: true });
  check(mealBlocked.status === 429, "3rd meal regen → 429", String(mealBlocked.status));
  check(
    mealBlocked.json?.message?.includes("Meal limit"),
    "meal 429 copy mentions Meal limit",
    mealBlocked.json?.message,
  );

  process.exit(failures === 0 ? 0 : 1);
};

void main();
