/**
 * PATCH /v1/me/profile (AMI-176) against LOCAL D1 (miniflare via wrangler).
 *   npm run db:migrate:local -w @mirra/api   # once
 *   npm run test:profile-update -w @mirra/api
 */
import assert from "node:assert/strict";

import { UpdateProfileBodySchema } from "@mirra/contracts";
import { getPlatformProxy } from "wrangler";

import { createApp } from "../src/app";
import type { MirraEnv } from "../src/env";

type Env = { DB: D1Database };

const run = async () => {
  const proxy = await getPlatformProxy<Env>({ configPath: "wrangler.jsonc" });
  const { DB } = proxy.env;
  const env = { ...proxy.env, ALLOW_DEV_USER_HEADER: "true", MIRRA_ENV: "local" } as unknown as MirraEnv;
  const app = createApp();

  const tag = Date.now().toString(36);
  const owner = `prof-owner-${tag}`;
  const other = `prof-other-${tag}`;

  const exec = async (sql: string, ...args: unknown[]) => {
    await DB.prepare(sql).bind(...args).run();
  };
  const seed = async (uid: string) => {
    await exec("INSERT INTO users (id, name) VALUES (?, ?)", uid, `t:${uid}`);
    await exec(
      "INSERT INTO profiles (user_id, sex, age_years, height_cm, weight_kg, goal_weight_kg, pace, timezone) VALUES (?, 'male', 29, 180, 82, 78, 'steady', 'America/New_York')",
      uid,
    );
    await exec(
      `INSERT INTO preferences (user_id, primary_goal, experience, equipment_json, train_days_json, session_minutes, diet_tags_json, foods_avoid, cuisine_json, units, trainer_persona, physique_target, lifestyle_notes, training_location, meals_per_day)
       VALUES (?, 'recomp', 'y1_2', '["dumbbells","barbell"]', '[1,3,5]', 45, '["high_protein"]', 'peanuts', '["american"]', 'imperial', 'spark', 'athletic', 'Desk job', 'home', 3)`,
      uid,
    );
    await exec(
      "INSERT INTO plans (id, user_id, version, status, week_start, source) VALUES (?, ?, 1, 'active', '2026-11-02', 'test')",
      `p-${uid}`,
      uid,
    );
  };
  await seed(owner);
  await seed(other);

  const patch = (uid: string | null, body: unknown) =>
    app.request(
      "/v1/me/profile",
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...(uid ? { "x-mirra-user-id": uid } : {}) },
        body: JSON.stringify(body),
      },
      env,
    );

  // 1. Age only: every other field unchanged.
  let res = await patch(owner, { ageYears: 31 });
  assert.equal(res.status, 200);
  let out = (await res.json()) as { profile: Record<string, unknown>; preferences: Record<string, unknown> };
  assert.equal(out.profile.ageYears, 31);
  assert.equal(out.profile.sex, "male");
  assert.equal(out.profile.heightCm, 180);
  assert.equal(out.profile.weightKg, 82);
  assert.equal(out.profile.goalWeightKg, 78);
  assert.equal(out.profile.timezone, "America/New_York");
  assert.deepEqual(out.preferences.trainDays, [1, 3, 5]);
  assert.deepEqual(out.preferences.dietTags, ["high_protein"]);
  assert.equal(out.preferences.trainingLocation, "home");
  assert.equal(out.preferences.trainerPersona, "spark");
  console.log("ok  age-only patch keeps every other field");

  // 2. Plan-affecting prefs: merged, sorted, other prefs intact, plan untouched.
  res = await patch(owner, { trainDays: [6, 2, 4, 1], sessionMinutes: 60, equipment: ["bands", "bands"] });
  assert.equal(res.status, 200);
  out = (await res.json()) as typeof out;
  assert.deepEqual(out.preferences.trainDays, [1, 2, 4, 6]);
  assert.equal(out.preferences.sessionMinutes, 60);
  assert.deepEqual(out.preferences.equipment, ["bands"]);
  assert.equal(out.preferences.primaryGoal, "recomp");
  assert.equal(out.preferences.mealsPerDay, 3);
  assert.equal(out.preferences.foodsAvoid, "peanuts");
  assert.equal(out.preferences.lifestyleNotes, "Desk job");
  assert.equal(out.profile.ageYears, 31);
  const plans = await DB.prepare("SELECT COUNT(*) n, MAX(version) v FROM plans WHERE user_id = ?").bind(owner).first<{ n: number; v: number }>();
  assert.deepEqual({ n: plans?.n, v: plans?.v }, { n: 1, v: 1 });
  console.log("ok  prefs patch merges, plan not regenerated");

  // 3. Nullables clear; units switch.
  res = await patch(owner, { physiqueTarget: null, lifestyleNotes: "", mealsPerDay: null, units: "metric", goalWeightKg: null });
  out = (await res.json()) as typeof out;
  assert.equal(out.preferences.physiqueTarget, null);
  assert.equal(out.preferences.lifestyleNotes, null);
  assert.equal(out.preferences.mealsPerDay, null);
  assert.equal(out.preferences.units, "metric");
  assert.equal(out.profile.goalWeightKg, null);
  console.log("ok  nullable fields clear");

  // 4. Ownership: the other user is untouched.
  const o = await DB.prepare("SELECT age_years a FROM profiles WHERE user_id = ?").bind(other).first<{ a: number }>();
  const op = await DB.prepare("SELECT train_days_json t, units u FROM preferences WHERE user_id = ?").bind(other).first<{ t: string; u: string }>();
  assert.equal(o?.a, 29);
  assert.equal(op?.t, "[1,3,5]");
  assert.equal(op?.u, "imperial");
  console.log("ok  other user untouched");

  // 5. Validation + auth.
  const bad: unknown[] = [
    {},
    { ageYears: 9 },
    { ageYears: 30.5 },
    { heightCm: 50 },
    { trainDays: [] },
    { trainDays: [1, 1] },
    { trainDays: [8] },
    { sessionMinutes: 50 },
    { mealsPerDay: 6 },
    { primaryGoal: "bulk" },
    { weightKg: 80 },
    { userId: other, ageYears: 40 },
  ];
  for (const b of bad) {
    assert.equal(UpdateProfileBodySchema.safeParse(b).success, false, JSON.stringify(b));
    const r = await patch(owner, b);
    assert.equal(r.status, 400, `expected 400 for ${JSON.stringify(b)}, got ${r.status}`);
  }
  assert.equal((await patch(null, { ageYears: 40 })).status, 401);
  console.log(`ok  ${bad.length} invalid bodies rejected (400), no auth 401`);

  for (const uid of [owner, other]) {
    await exec("DELETE FROM plans WHERE user_id = ?", uid);
    await exec("DELETE FROM preferences WHERE user_id = ?", uid);
    await exec("DELETE FROM profiles WHERE user_id = ?", uid);
    await exec("DELETE FROM users WHERE id = ?", uid);
  }
  await proxy.dispose();
  console.log("PASS profile-update");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
