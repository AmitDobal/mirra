#!/usr/bin/env node
/**
 * Smoke: check-in streak (AMI-154).
 *   API_BASE=http://127.0.0.1:8793 node scripts/smoke-streaks.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (x-mirra-user-id). Timezone UTC so local days are deterministic.
 *
 * Covers: fresh user = cold 0 -> check-in today = lit 1 -> 3-day run (today, -1, -2) = 3, best 3 ->
 * re-post same day is idempotent -> skipped today does not count -> backdated-only (yesterday) = at_risk.
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
const streak = async (user) => (await call(user, "GET", "/v1/streaks")).json?.streaks?.[0];
const show = (label, v) => console.log(`      ${label}: ${JSON.stringify(v)}`);

const onboard = (user) =>
  call(user, "PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle", experience: "months", equipment: ["full_gym"], trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45, cuisineStyles: ["other"], foodsAvoid: null,
    },
  });

const main = async () => {
  const a = `smoke-streak-a-${Date.now()}`;
  await onboard(a);
  let s = await streak(a);
  show("fresh", s);
  check(s?.fire === "cold" && s.current === 0 && s.best === 0, "fresh user: cold, 0/0");

  await checkIn(a, 0);
  s = await streak(a);
  show("today", s);
  check(s?.fire === "lit" && s.current === 1 && s.lastActiveDate === day(0), "check-in today: lit, 1");

  await checkIn(a, -1);
  await checkIn(a, -2);
  s = await streak(a);
  show("3-day", s);
  check(s?.current === 3 && s.best === 3, "today + 2 backdated days: current 3, best 3");

  await checkIn(a, 0);
  s = await streak(a);
  check(s?.current === 3, "same-day re-post is idempotent");

  await checkIn(a, 0, "skipped");
  s = await streak(a);
  show("skipped today", s);
  check(s?.current === 2 && s.fire === "at_risk" && s.best === 3, "skipped today stops counting: 2, at_risk, best stays 3");

  const b = `smoke-streak-b-${Date.now()}`;
  await onboard(b);
  await checkIn(b, -1);
  s = await streak(b);
  show("yesterday only", s);
  check(s?.current === 1 && s.fire === "at_risk", "yesterday only: at_risk, 1");

  const c = `smoke-streak-c-${Date.now()}`;
  await onboard(c);
  await checkIn(c, -3);
  s = await streak(c);
  show("broken", s);
  check(s?.current === 0 && s.fire === "cold", "last check-in 3 days ago: cold, 0");

  const unauth = await fetch(`${BASE}/v1/streaks`);
  check(unauth.status === 401, "no auth = 401", String(unauth.status));

  if (failures > 0) {
    console.error(`${failures} FAILED`);
    process.exit(1);
  }
  console.log("PASS streaks smoke");
};
main();
