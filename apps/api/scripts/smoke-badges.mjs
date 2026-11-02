#!/usr/bin/env node
/**
 * Smoke: kinetic badges (AMI-156).
 *   API_BASE=http://127.0.0.1:8793 node scripts/smoke-badges.mjs
 */
const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
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
const checkIn = (user, offset, status = "done") =>
  call(user, "POST", "/v1/check-ins", { localDate: day(offset), status });
const badges = (user) => call(user, "GET", "/v1/badges");

const onboard = (user) =>
  call(user, "PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle", experience: "months", equipment: ["full_gym"], trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45, cuisineStyles: ["other"], foodsAvoid: null,
    },
  });

const main = async () => {
  const u = `smoke-badges-${Date.now()}`;
  await onboard(u);

  let b = (await badges(u)).json;
  check(b?.definitions?.length === 5, "5 kinetic definitions seeded");
  check(b?.unlocked?.length === 0 && b?.currentRankId === null, "fresh user: no unlocks");

  for (let i = 0; i < 7; i += 1) await checkIn(u, -i);
  b = (await badges(u)).json;
  check(b?.bestStreak >= 7, "best streak at least 7 after week of check-ins");
  check(
    b?.unlocked?.some((x) => x.badgeId === "rank_spark"),
    "Spark unlocked after 7-day best",
  );
  check(b?.currentRankId === "rank_spark", "current rank Spark");

  const unauth = await fetch(`${BASE}/v1/badges`);
  check(unauth.status === 401, "no auth = 401", String(unauth.status));

  if (failures > 0) {
    console.error(`${failures} FAILED`);
    process.exit(1);
  }
  console.log("PASS badges smoke");
};
main();
