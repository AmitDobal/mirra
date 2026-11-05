/**
 * AMI-184 end to end on LOCAL D1 (OpenAI stubbed, other fetches pass through):
 * onboarding Mon/Wed/Thu/Fri → generate (model puts a lift on Sat) → persisted lifts on the
 * chosen days; "missed session" rebuild preview + apply keeps them; check-in coach request
 * carries the user's persona and GoalContext.
 *   npm run db:migrate:local -w @mirra/api   # once
 *   npm run test:train-days -w @mirra/api
 */
import assert from "node:assert/strict";

import { getPlatformProxy } from "wrangler";

import { createApp } from "../src/app";
import { createDb } from "../src/db";
import type { MirraEnv } from "../src/env";
import { applyRebuild, previewRebuild } from "../src/services/rebuild-plan";

type Sent = { system: string; user: string };
const sent: Sent[] = [];
let planDays = [0, 2, 3, 5];

const weekReply = (body: string) => {
  const weekStart = /"weekStart":"(\d{4}-\d{2}-\d{2})"/.exec(body)?.[1] ?? "2026-11-02";
  const d = (i: number) => {
    const x = new Date(`${weekStart}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  };
  return {
    summary: { kcalTarget: 2300, proteinG: 170, carbsG: 250, fatG: 70, outcomeLine: "A steady week for your goal." },
    days: Array.from({ length: 7 }, (_, i) => {
      const w = planDays.indexOf(i);
      return w >= 0 ? { dayIndex: i, date: d(i), kind: "lift", label: `S${w}`, workoutIndex: w } : { dayIndex: i, date: d(i), kind: "rest" };
    }),
    workouts: planDays.map((_, w) => ({ title: `Session ${w}`, durationMin: 45, exercises: [{ name: "Back squat", targetSets: 3, targetReps: "6-8" }] })),
  };
};

const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
  if (!String(url).includes("api.openai.com")) return realFetch(url, init);
  const raw = String(init?.body ?? "{}");
  const body = JSON.parse(raw) as { messages: { role: string; content: string }[] };
  const system = body.messages.find((m) => m.role === "system")?.content ?? "";
  const user = body.messages.find((m) => m.role === "user")?.content ?? "";
  sent.push({ system, user });
  const content = system.includes("building a highly personalized week")
    ? JSON.stringify(weekReply(user))
    : system.includes("co-coach for lifters")
      ? JSON.stringify({ message: "Twenty minutes today, then call it.", rebuildSuggested: false })
      : JSON.stringify({ tags: [] });
  return new Response(JSON.stringify({ model: "stub", choices: [{ message: { content } }] }), { status: 200 });
}) as typeof fetch;

const run = async () => {
  const proxy = await getPlatformProxy<MirraEnv>({ configPath: "wrangler.jsonc" });
  const env = { ...proxy.env, ALLOW_DEV_USER_HEADER: "true", OPENAI_API_KEY: "stub", AI_PROVIDER: "openai" } as MirraEnv;
  const app = createApp();
  const user = `train-days-${Date.now().toString(36)}`;
  const call = (method: string, path: string, body?: unknown) =>
    app.request(
      path,
      { method, headers: { "content-type": "application/json", "x-mirra-user-id": user }, body: body ? JSON.stringify(body) : undefined },
      env,
    );
  const liftDays = async () =>
    (
      await proxy.env.DB.prepare(
        "SELECT d.day_index i FROM plan_days d JOIN plans p ON p.id = d.plan_id WHERE p.user_id = ? AND p.status = 'ready' AND d.kind = 'lift' ORDER BY d.day_index",
      )
        .bind(user)
        .all<{ i: number }>()
    ).results.map((r) => r.i);

  try {
    const onb = await call("PUT", "/v1/onboarding", {
      profile: { sex: "female", ageYears: 31, heightCm: 168, weightKg: 76, goalWeightKg: 70, pace: "steady", timezone: "UTC" },
      preferences: {
        primaryGoal: "lose_fat", experience: "months", equipment: ["full_gym"], trainDays: [1, 3, 4, 5],
        sessionMinutes: 45, cuisineStyles: ["other"], foodsAvoid: null, trainerPersona: "wit",
      },
    });
    assert.equal(onb.status, 200, await onb.clone().text());

    const gen = await call("POST", "/v1/plans/generate", {});
    assert.equal(gen.status, 201, await gen.clone().text());
    assert.ok(sent.some((s) => s.system.includes("lift ONLY on Mon, Wed, Thu, Fri")), "plan prompt names the train days");
    assert.deepEqual(await liftDays(), [0, 2, 3, 4], "generate: model's Sat lift persisted on Fri");
    console.log("PASS  generate: lifts Mon/Wed/Thu/Fri (model said Sat)");

    planDays = [1, 2, 3, 6]; // the QA rebuild: Tue + Sun
    const db = createDb(proxy.env.DB);
    const preview = await previewRebuild(db, env, user, "Missed session: shift the remaining lifts");
    const afterLifts = preview.after.days.filter((d) => d.kind === "lift").map((d) => d.dayIndex);
    assert.deepEqual(afterLifts, [0, 2, 3, 4], `rebuild preview lifts ${afterLifts}`);
    await applyRebuild(db, user, preview.previewToken!);
    assert.deepEqual(await liftDays(), [0, 2, 3, 4], "rebuild apply keeps train days");
    console.log("PASS  missed-session rebuild: preview + apply stay on Mon/Wed/Thu/Fri");

    const ci = await call("POST", "/v1/check-ins", { localDate: "2026-11-05", status: "skipped" });
    assert.equal(ci.status, 201, await ci.clone().text());
    const coach = sent.filter((s) => s.system.includes("co-coach for lifters")).at(-1);
    assert.ok(coach, "check-in called the coach");
    assert.ok(coach.system.includes("PERSONA: Side-Eye (wit)"), "check-in coach uses the user's persona");
    assert.ok(coach.system.includes("GOAL RULES") && coach.user.includes('"goal":'), "check-in coach gets GoalContext");
    console.log("PASS  check-in coach: wit persona + GoalContext");
    console.log("\nassert-train-days-d1: ok");
  } finally {
    for (const sql of [
      "DELETE FROM plan_days WHERE plan_id IN (SELECT id FROM plans WHERE user_id = ?1)",
      "DELETE FROM workout_exercises WHERE workout_id IN (SELECT w.id FROM workouts w JOIN plans p ON p.id = w.plan_id WHERE p.user_id = ?1)",
      "DELETE FROM workouts WHERE plan_id IN (SELECT id FROM plans WHERE user_id = ?1)",
      "DELETE FROM plan_jobs WHERE user_id = ?1",
      "DELETE FROM plans WHERE user_id = ?1",
      "DELETE FROM users WHERE id = ?1",
    ]) {
      await proxy.env.DB.prepare(sql).bind(user).run().catch(() => undefined);
    }
    await proxy.dispose();
  }
};

void run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
