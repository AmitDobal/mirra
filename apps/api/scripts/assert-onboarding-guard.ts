/**
 * AMI-177: PUT /v1/onboarding never silently overwrites a completed profile.
 * Runs the real Hono route against LOCAL D1 (miniflare via wrangler).
 *   npm run db:migrate:local -w @mirra/api   # once
 *   npm run test:onboarding-guard -w @mirra/api
 */
import assert from "node:assert/strict";

import { getPlatformProxy } from "wrangler";

import { createApp } from "../src/app";
import type { MirraEnv } from "../src/env";
import { decideOnboardingWrite } from "../src/routes/onboarding";

const body = (overrides: { goal?: string; weightKg?: number; reset?: boolean } = {}) => ({
  profile: { sex: "male", ageYears: 34, heightCm: 182, weightKg: overrides.weightKg ?? 90, timezone: "UTC" },
  preferences: {
    primaryGoal: overrides.goal ?? "lose_fat",
    experience: "y3_plus",
    equipment: ["full_gym"],
    trainDays: [1, 3, 5],
    sessionMinutes: 60,
    cuisineStyles: ["other"],
    foodsAvoid: null,
  },
  ...(overrides.reset === undefined ? {} : { reset: overrides.reset }),
});

const run = async () => {
  // Pure decision table.
  assert.equal(decideOnboardingWrite({ alreadyCompleted: false, reset: undefined }), "write");
  assert.equal(decideOnboardingWrite({ alreadyCompleted: false, reset: true }), "write");
  assert.equal(decideOnboardingWrite({ alreadyCompleted: true, reset: undefined }), "reject");
  assert.equal(decideOnboardingWrite({ alreadyCompleted: true, reset: false }), "reject");
  assert.equal(decideOnboardingWrite({ alreadyCompleted: true, reset: true }), "write");

  const proxy = await getPlatformProxy<MirraEnv>({ configPath: "wrangler.jsonc" });
  const env = { ...proxy.env, ALLOW_DEV_USER_HEADER: "true" } as MirraEnv;
  const app = createApp();
  const user = `onb-guard-${Date.now().toString(36)}`;

  const put = (payload: unknown) =>
    app.request(
      "/v1/onboarding",
      {
        method: "PUT",
        headers: { "content-type": "application/json", "x-mirra-user-id": user },
        body: JSON.stringify(payload),
      },
      env,
    );
  const row = async () =>
    proxy.env.DB.prepare(
      "SELECT p.weight_kg w, pr.primary_goal g FROM profiles p JOIN preferences pr ON pr.user_id = p.user_id WHERE p.user_id = ?",
    )
      .bind(user)
      .first<{ w: number; g: string }>();

  try {
    // First completion: allowed.
    const first = await put(body());
    assert.equal(first.status, 200, await first.clone().text());
    assert.deepEqual(await row(), { w: 90, g: "lose_fat" });

    // Replay with funnel defaults (the cold-start bug): rejected, data untouched.
    const replay = await put(body({ goal: "build_muscle", weightKg: 76 }));
    assert.equal(replay.status, 409);
    const err = (await replay.json()) as { error?: { code?: string } };
    assert.equal(err.error?.code, "already_onboarded");
    assert.deepEqual(await row(), { w: 90, g: "lose_fat" });

    // reset: false is still a reject.
    assert.equal((await put(body({ goal: "build_muscle", reset: false }))).status, 409);

    // Explicit quiz re-run in this session: allowed.
    const reset = await put(body({ goal: "build_muscle", weightKg: 80, reset: true }));
    assert.equal(reset.status, 200);
    assert.deepEqual(await row(), { w: 80, g: "build_muscle" });

    console.log("assert-onboarding-guard: ok");
  } finally {
    await proxy.env.DB.prepare("DELETE FROM preferences WHERE user_id = ?").bind(user).run();
    await proxy.env.DB.prepare("DELETE FROM profiles WHERE user_id = ?").bind(user).run();
    await proxy.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user).run();
    await proxy.dispose();
  }
};

void run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
