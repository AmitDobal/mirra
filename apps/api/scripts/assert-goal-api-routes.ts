/**
 * Route-level goal checks (AMI-179) through `createApp()` on an in-memory D1 shim:
 * triggers wired, ETag / 304 over HTTP, restart 429, ownership, trigger failure isolation.
 * Imported by `assert-goal-api.ts` (shares its pass/fail counters).
 */
import { GoalResponseSchema } from "@mirra/contracts";

import { createApp } from "../src/app";
import type { MirraEnv } from "../src/env";
import type { Check } from "./assert-goal-api";
import { createMemoryD1 } from "./lib/memory-d1";

const ONBOARD = {
  profile: { sex: "male", ageYears: 29, heightCm: 180, weightKg: 82, goalWeightKg: 75, pace: "steady", timezone: "UTC" },
  preferences: { primaryGoal: "lose_fat", experience: "months", trainDays: [1, 2, 4, 5], sessionMinutes: 45, cuisineStyles: ["american"] },
  commitment: { committedAt: 1_793_750_400_000 },
};

const client = (d1: D1Database) => {
  const app = createApp();
  const env = { DB: d1, ALLOW_DEV_USER_HEADER: "true", MIRRA_ENV: "local" } as unknown as MirraEnv;
  return (uid: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    app.request(
      path,
      {
        method,
        headers: { "content-type": "application/json", "x-mirra-user-id": uid, ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      env,
    );
};

export const runRouteAsserts = async (check: Check, _days: (n: number) => number) => {
  const { d1, sqlite } = createMemoryD1();
  const call = client(d1);
  const n = (sql: string, ...a: string[]) => Number((sqlite.prepare(sql).get(...a) as { n: number }).n);
  const R = "route-r";
  const Q = "route-q";

  const onb = await call(R, "PUT", "/v1/onboarding", ONBOARD);
  const plan = sqlite.prepare("SELECT version, committed_at, start_weight_kg FROM goal_plans WHERE user_id = ?").get(R) as
    | { version: number; committed_at: number; start_weight_kg: number }
    | undefined;
  check(onb.status === 200 && plan?.version === 1 && plan.committed_at === ONBOARD.commitment.committedAt, "PUT /v1/onboarding → goal v1 + committedAt", String(onb.status));

  const g1 = await call(R, "GET", "/v1/goal");
  const etag1 = g1.headers.get("etag");
  const b1 = GoalResponseSchema.safeParse(await g1.json());
  check(g1.status === 200 && !!etag1 && b1.success && b1.data.plan?.startWeightKg === 82, "GET /v1/goal → 200 + ETag + valid body", `${g1.status} ${etag1}`);
  const g304 = await call(R, "GET", "/v1/goal", undefined, { "if-none-match": etag1! });
  check(g304.status === 304 && g304.headers.get("etag") === etag1, "If-None-Match → 304", String(g304.status));

  const w = await call(R, "POST", "/v1/weight", { kg: 81.5 });
  check(w.status === 201, "POST /v1/weight → 201");
  check(n("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ? AND trigger = 'weight'", R) === 1, "weight trigger refreshed the snapshot");
  const g2 = await call(R, "GET", "/v1/goal", undefined, { "if-none-match": etag1! });
  check(g2.status === 200 && g2.headers.get("etag") !== etag1, "old ETag after weigh-in → 200 + new ETag");

  const ci = await call(R, "POST", "/v1/check-ins", { localDate: new Date().toISOString().slice(0, 10), status: "done" });
  check(ci.status === 201 && n("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ? AND trigger = 'check_in'", R) === 1, "POST /v1/check-ins → check_in snapshot", String(ci.status));

  const pr = await call(R, "PATCH", "/v1/me/profile", { pace: "aggressive" });
  check(pr.status === 200 && n("SELECT MAX(version) n FROM goal_plans WHERE user_id = ?", R) === 2, "PATCH /v1/me/profile pace → v2");
  check(n("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ?", R) === 1, "all same-day triggers share one snapshot row");

  const rs1 = await call(R, "POST", "/v1/goal/restart");
  const rs2 = await call(R, "POST", "/v1/goal/restart");
  check(rs1.status === 201 && rs2.status === 429, "POST /v1/goal/restart → 201, then 429", `${rs1.status} ${rs2.status}`);

  // Ownership: Q (no onboarding) sees nothing of R and cannot restart.
  const gq = (await (await call(Q, "GET", "/v1/goal")).json()) as { plan: unknown };
  const rq = await call(Q, "POST", "/v1/goal/restart");
  check(gq.plan === null && rq.status === 404 && n("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ?", Q) === 0, "other user: plan null, restart 404");
  check(n("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ?", R) === 3, "R keeps its 3 versions");

  // Trigger failure isolation: snapshots table gone → every parent write still succeeds.
  const bad = createMemoryD1();
  bad.sqlite.exec("DROP TABLE goal_snapshots");
  const callBad = client(bad.d1);
  const warn = console.warn;
  let warned = 0;
  console.warn = () => void (warned += 1);
  const bo = await callBad(R, "PUT", "/v1/onboarding", ONBOARD);
  const bw = await callBad(R, "POST", "/v1/weight", { kg: 81.2 });
  const bc = await callBad(R, "POST", "/v1/check-ins", { localDate: new Date().toISOString().slice(0, 10), status: "done" });
  const bp = await callBad(R, "PATCH", "/v1/me/profile", { pace: "aggressive" });
  console.warn = warn;
  const kept = Number((bad.sqlite.prepare("SELECT COUNT(*) n FROM weight_logs WHERE user_id = ?").get(R) as { n: number }).n);
  check(bo.status === 200 && bw.status === 201 && bc.status === 201 && bp.status === 200 && kept === 1,
    "goal refresh throws → onboarding 200, weight 201, check-in 201, PATCH 200", `${bo.status} ${bw.status} ${bc.status} ${bp.status}`);
  check(warned >= 4, "each failed refresh is logged", String(warned));
};
