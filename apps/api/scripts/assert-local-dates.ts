/**
 * AMI-183: "today" and day buckets follow the user's profile timezone, never UTC.
 * Pure checks on lib/dates + route checks on an in-memory D1 (meals bucketed in the user's day).
 *   npm run test:local-dates -w @mirra/api
 */
import assert from "node:assert/strict";

import { createApp } from "../src/app";
import { createDb } from "../src/db";
import { auditLog } from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { dayBoundsIn, dayBoundsMs, localDateIn, localHourIn } from "../src/lib/dates";
import { windowBoundsMs } from "../src/lib/history-window";
import { MEAL_DAY_ACTION, mealDayQuotaOk } from "../src/services/revise/limits";
import { createMemoryD1 } from "./lib/memory-d1";

const at = (iso: string) => new Date(iso);
const H = 3_600_000;

// ── localDateIn ──────────────────────────────────────────────────────────────
// Wed Nov 4 7:30 PM PST = Thu 03:30 UTC: UTC already says tomorrow.
assert.equal(localDateIn("America/Los_Angeles", at("2026-11-05T03:30:00Z")), "2026-11-04");
assert.equal(localDateIn("America/New_York", at("2026-11-05T01:00:00Z")), "2026-11-04");
// Thu Nov 5 00:32 IST = Wed 19:02 UTC: UTC still says yesterday (QA R27).
assert.equal(localDateIn("Asia/Kolkata", at("2026-11-04T19:02:00Z")), "2026-11-05");
assert.equal(localDateIn("Not/AZone", at("2026-11-04T19:02:00Z")), "2026-11-04");
console.log("ok  localDateIn: US evening, IST past midnight, bad zone falls back to UTC");

// ── localHourIn ──────────────────────────────────────────────────────────────
assert.equal(localHourIn("America/Los_Angeles", at("2026-11-05T03:30:00Z")), 19);
assert.equal(localHourIn("Asia/Kolkata", at("2026-11-04T19:02:00Z")), 0);
assert.equal(localHourIn("Not/AZone", at("2026-11-04T19:02:00Z")), 19);
console.log("ok  localHourIn");

// ── dayBoundsIn ──────────────────────────────────────────────────────────────
const la = dayBoundsIn("America/Los_Angeles", "2026-11-04");
assert.equal(la.start, Date.parse("2026-11-04T08:00:00Z"));
assert.equal(la.end, Date.parse("2026-11-05T08:00:00Z"));
const ny = dayBoundsIn("America/New_York", "2026-11-04");
assert.equal(ny.start, Date.parse("2026-11-04T05:00:00Z"));
assert.equal(ny.end - ny.start, 24 * H);
const ist = dayBoundsIn("Asia/Kolkata", "2026-11-05");
assert.equal(ist.start, Date.parse("2026-11-04T18:30:00Z"));
assert.equal(ist.end, Date.parse("2026-11-05T18:30:00Z"));
// US DST ends Sun Nov 1 2026 (25h day); starts Sun Mar 8 2026 (23h day).
const fallBack = dayBoundsIn("America/Los_Angeles", "2026-11-01");
assert.equal(fallBack.start, Date.parse("2026-11-01T07:00:00Z"));
assert.equal(fallBack.end, Date.parse("2026-11-02T08:00:00Z"));
assert.equal(fallBack.end - fallBack.start, 25 * H);
const springFwd = dayBoundsIn("America/New_York", "2026-03-08");
assert.equal(springFwd.end - springFwd.start, 23 * H);
assert.deepEqual(dayBoundsIn("UTC", "2026-11-04"), dayBoundsMs("2026-11-04"));
assert.deepEqual(dayBoundsIn("Not/AZone", "2026-11-04"), dayBoundsMs("2026-11-04"));
// The 7:30 PM PST instant is inside Nov 4 (LA), not Nov 5.
const evening = Date.parse("2026-11-05T03:30:00Z");
assert.ok(evening >= la.start && evening < la.end);
console.log("ok  dayBoundsIn: LA, NY, IST, DST fall-back 25h / spring-forward 23h, UTC + bad-zone fallback");

const wk = windowBoundsMs({ from: "2026-11-02", to: "2026-11-08" }, "Asia/Kolkata");
assert.equal(wk.start, Date.parse("2026-11-01T18:30:00Z"));
assert.equal(wk.end, Date.parse("2026-11-08T18:30:00Z"));
assert.deepEqual(windowBoundsMs({ from: "2026-11-02", to: "2026-11-08" }), {
  start: Date.parse("2026-11-02T00:00:00Z"),
  end: Date.parse("2026-11-09T00:00:00Z"),
});
console.log("ok  windowBoundsMs in zone (UTC default unchanged)");

// ── Routes: a Los Angeles user's evening meal stays on their day ─────────────
const run = async () => {
  const { d1 } = createMemoryD1();
  const app = createApp();
  const env = { DB: d1, ALLOW_DEV_USER_HEADER: "true", MIRRA_ENV: "local" } as unknown as MirraEnv;
  const call = (method: string, path: string, body?: unknown) =>
    app.request(
      path,
      {
        method,
        headers: { "content-type": "application/json", "x-mirra-user-id": "tz-la" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      env,
    );
  const onb = await call("PUT", "/v1/onboarding", {
    profile: { sex: "female", ageYears: 28, heightCm: 170, weightKg: 70, goalWeightKg: 64, pace: "steady", timezone: "America/Los_Angeles" },
    preferences: { primaryGoal: "lose_fat", experience: "months", trainDays: [1, 3, 5], sessionMinutes: 45, cuisineStyles: ["american"] },
  });
  assert.equal(onb.status, 200, `onboarding ${onb.status}`);
  const meal = (name: string, kcal: number, iso: string) =>
    call("POST", "/v1/meals", { name, mealSlot: "snack", kcal, eatenAt: Date.parse(iso) });
  for (const r of [
    await meal("breakfast", 300, "2026-11-04T16:00:00Z"), // Wed 8 AM PST
    await meal("late dinner", 500, "2026-11-05T04:00:00Z"), // Wed 8 PM PST (UTC Thu)
    await meal("next day", 700, "2026-11-05T17:00:00Z"), // Thu 9 AM PST
  ]) assert.equal(r.status, 201);

  const fuel = (await (await call("GET", "/v1/fuel/today?date=2026-11-04")).json()) as { logged: { kcal: number } };
  assert.equal(fuel.logged.kcal, 800, `fuel/today Wed = ${fuel.logged.kcal}`);
  const today = (await (await call("GET", "/v1/today?date=2026-11-04")).json()) as { fuel: { kcalLogged: number } };
  assert.equal(today.fuel.kcalLogged, 800);
  const thu = (await (await call("GET", "/v1/fuel/today?date=2026-11-05")).json()) as { logged: { kcal: number } };
  assert.equal(thu.logged.kcal, 700);
  console.log("ok  /v1/fuel/today + /v1/today bucket meals in the profile timezone");

  const sum = (await (await call("GET", "/v1/nutrition/summary?range=week&anchor=2026-11-04")).json()) as {
    series: Array<{ date: string; kcalIn: number }>;
  };
  const byDate = Object.fromEntries(sum.series.map((d) => [d.date, d.kcalIn]));
  assert.equal(byDate["2026-11-04"], 800, `rollup Wed = ${byDate["2026-11-04"]}`);
  assert.equal(byDate["2026-11-05"], 700);
  console.log("ok  nutrition rollups use the profile-timezone day");

  // No date sent: the server's today is the user's local today, not UTC.
  const noDate = (await (await call("GET", "/v1/today")).json()) as { date: string };
  assert.equal(noDate.date, localDateIn("America/Los_Angeles"));
  console.log("ok  /v1/today without a date = profile-timezone today");

  // Plan-chat daily caps reset at the user's local midnight, not UTC (QA iOS X1, limits.ts).
  const db = createDb(d1);
  const tz = "America/Los_Angeles";
  const localStart = dayBoundsIn(tz, localDateIn(tz)).start;
  const ctx = { db, userId: "tz-la" } as Parameters<typeof mealDayQuotaOk>[0];
  const audit = (id: string, ms: number) =>
    db.insert(auditLog).values({ id, userId: "tz-la", action: MEAL_DAY_ACTION, createdAt: new Date(ms) });
  await audit("cap-y1", localStart - 60_000);
  await audit("cap-y2", localStart - 120_000);
  assert.equal(await mealDayQuotaOk(ctx), true, "yesterday's (local) rebuilds must not count today");
  await audit("cap-t1", localStart + 60_000);
  await audit("cap-t2", localStart + 120_000);
  assert.equal(await mealDayQuotaOk(ctx), false, "two local-today rebuilds hit the cap");
  console.log("ok  revise caps count from the user's local midnight");

  // Rebuild is Pro-only: a free user gets 403 before the AI preview runs (AMI-183 item 8).
  const pre = await call("POST", "/v1/plans/rebuild/preview", { reason: "Missed session: shift the remaining lifts" });
  assert.equal(pre.status, 403, `free rebuild preview ${pre.status}`);
  console.log("ok  free rebuild preview → 403 (no AI call)");
};

run().then(
  () => console.log("assert-local-dates: all passed"),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
