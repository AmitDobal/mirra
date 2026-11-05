/**
 * Goal timeline API (AMI-179) on in-memory D1: plan versions, snapshots, ETag, restart,
 * triggers, backfill, ownership. Route-level checks live in `assert-goal-api-routes.ts`.
 *   npm run test:goal-api -w @mirra/api
 */
import { GoalContextSchema, projectGoal } from "@mirra/contracts";

import { createDb } from "../src/db";
import { ApiError } from "../src/lib/errors";
import { deleteAccount } from "../src/services/account-deletion";
import { buildGoalContext } from "../src/services/goal-context";
import { readGoal, restartGoal } from "../src/services/goal-read";
import { applyProfileEdit, refreshGoalSafe, startGoalFromOnboarding } from "../src/services/goal-refresh";
import { updateProfile } from "../src/services/profile-update";
import { completeSession } from "../src/services/workout-complete";
import { runRouteAsserts } from "./assert-goal-api-routes";
import { DAY35, START, at, days, fixtureInput, seeder } from "./lib/goal-seed";
import { createMemoryD1 } from "./lib/memory-d1";

let passes = 0;
let failures = 0;
export type Check = (ok: boolean, label: string, detail?: string) => void;
const check: Check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (ok) passes += 1;
  else failures += 1;
};
const ok200 = <T extends { kind: string }>(r: T) => (r.kind === "ok" ? (r as Extract<T, { kind: "ok" }>) : null);

const run = async () => {
  const { d1, sqlite } = createMemoryD1();
  const db = createDb(d1);
  const s = seeder(sqlite);
  const plansOf = (uid: string) =>
    sqlite.prepare("SELECT version, status, reason, start_date, start_weight_kg, pace, committed_at FROM goal_plans WHERE user_id = ? ORDER BY version").all(uid) as {
      version: number; status: string; reason: string; start_date: string; start_weight_kg: number | null; pace: string | null; committed_at: number | null;
    }[];

  // ── 1. Onboarding creates v1 with the commitment; day-35 fixture numbers ─────
  const A = "goal-a";
  s.user(A);
  const committedAt = at(START, 9);
  const v1 = await startGoalFromOnboarding(db, A, committedAt, new Date(at(START, 10)));
  check(v1?.plan.version === 1 && v1.plan.reason === "onboarding" && v1.plan.committedAt === committedAt, "onboarding → v1 with committedAt");
  check(v1?.plan.etaExpected === "2027-03-06" && v1.plan.etaOptimistic === "2027-02-16" && v1.plan.etaConservative === "2027-04-26",
    "v1 day-0 band Mar 6 (Feb 16 – Apr 26)", `${v1?.plan.etaExpected} ${v1?.plan.etaOptimistic} ${v1?.plan.etaConservative}`);
  check(v1?.plan.startWeightKg === 82 && v1.plan.kcalHint === 2257, "v1 frozen start 82 kg, kcal hint 2257");

  s.fixtureBehaviour(A);
  const now35 = new Date(at(DAY35, 20));
  const r35 = ok200(await readGoal(db, A, { now: now35 }));
  const want = projectGoal({ ...fixtureInput(), plannedLine: JSON.parse(v1!.plan.plannedLineJson) as number[] });
  check(!!r35 && r35.body.status === "on_track", "day 35 on_track", r35?.body.status);
  check(JSON.stringify(r35?.body.band) === JSON.stringify(want.band), "day 35 band = engine fixture", JSON.stringify(r35?.body.band));
  check(r35?.body.trendKg === want.trendKg && r35?.body.adherence.score === want.adherence.score,
    "trend + adherence from D1 rows = fixture", `${r35?.body.trendKg} / ${r35?.body.adherence.score}`);
  check(r35?.body.plan?.originalEta === "2027-03-06" && r35.body.chart?.actual.length === 36, "originalEta Mar 6, chart 36 actual points");
  check(s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ? AND local_date = ?", A, DAY35) === 1, "GET wrote today's snapshot");

  // ── 2. ETag / 304 ────────────────────────────────────────────────────────────
  const etag1 = r35!.etag!;
  const again = await readGoal(db, A, { now: new Date(now35.getTime() + 1000), ifNoneMatch: etag1 });
  check(again.kind === "not_modified" && again.etag === etag1, "same ETag → 304", again.kind);
  check((await readGoal(db, A, { now: now35, ifNoneMatch: '"0-0"' })).kind === "ok", "other ETag → 200");

  // ── 3. Weight log → same-day snapshot upsert, ETag changes ──────────────────
  const tW = now35.getTime() + 60_000;
  s.exec("INSERT INTO weight_logs (id, user_id, kg, logged_at) VALUES ('w-a-new', ?, 78.9, ?)", A, tW);
  await refreshGoalSafe(db, A, "weight", new Date(tW + 5));
  check(s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ? AND local_date = ?", A, DAY35) === 1, "weight log → still one snapshot row for the date");
  const trig = sqlite.prepare("SELECT trigger FROM goal_snapshots WHERE user_id = ? AND local_date = ?").get(A, DAY35) as { trigger: string };
  check(trig.trigger === "weight", "snapshot trigger = weight");
  const old = await readGoal(db, A, { now: new Date(tW + 10), ifNoneMatch: etag1 });
  const etag2 = ok200(old)?.etag;
  check(old.kind === "ok" && etag2 !== etag1, "old ETag after weigh-in → 200 + new ETag", `${etag1} → ${etag2}`);
  check((await readGoal(db, A, { now: new Date(tW + 20), ifNoneMatch: etag2 })).kind === "not_modified", "new ETag → 304");

  // ── 4. Snapshot per day ──────────────────────────────────────────────────────
  const before = s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ?", A);
  await refreshGoalSafe(db, A, "read", new Date(at("2026-12-10", 9)));
  await refreshGoalSafe(db, A, "read", new Date(at("2026-12-10", 11)));
  check(before === 2 && s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ?", A) === 3, "next day → one new snapshot row (Nov 4, Dec 9, Dec 10)");

  // ── 5. Profile edit: pace → v2 (frozen start); lifestyleNotes → still v2 ────
  const tP = new Date(at("2026-12-10", 10));
  await updateProfile(db, A, { pace: "aggressive" }, tP);
  const p2 = await applyProfileEdit(db, A, { pace: "aggressive" }, tP);
  const vs = plansOf(A);
  check(p2?.plan.version === 2 && vs.length === 2 && vs[0]!.status === "superseded" && vs[1]!.status === "active", "PATCH pace → v2, v1 superseded");
  check(vs[1]!.start_weight_kg === 82 && vs[1]!.start_date === START && vs[1]!.pace === "aggressive" && vs[1]!.reason === "profile_edit",
    "v2 keeps start 82 kg + start date, reason profile_edit");
  check(vs[1]!.committed_at === committedAt, "v2 carries the commitment");
  await updateProfile(db, A, { lifestyleNotes: "Desk job" }, tP);
  await applyProfileEdit(db, A, { lifestyleNotes: "Desk job" }, tP);
  check(plansOf(A).length === 2, "PATCH lifestyleNotes → version stays 2");
  await applyProfileEdit(db, A, { pace: "aggressive" }, tP);
  check(plansOf(A).length === 2, "PATCH same pace again → no new version");
  check(s.count("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ? AND status = 'active'", A) === 1, "exactly one active plan");

  // ── 6. Workout complete → goal effect (once) ────────────────────────────────
  let goalCalls = 0;
  const effects = { recompute: async () => [], goal: async () => void (goalCalls += 1) };
  s.exec("INSERT INTO workout_sessions (id, user_id, started_at) VALUES ('ws-live', ?, ?)", A, Date.now() - 60_000);
  await completeSession(db, A, "ws-live", { rpe: 7 }, effects);
  await completeSession(db, A, "ws-live", { rpe: 8 }, effects);
  check(goalCalls === 1, "complete → CompleteEffects.goal once (repeat skips)", String(goalCalls));
  s.exec("INSERT INTO workout_sessions (id, user_id, started_at) VALUES ('ws-live2', ?, ?)", A, Date.now() - 30_000);
  await completeSession(db, A, "ws-live2", {}, { recompute: async () => [] });
  check(s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ? AND trigger = 'workout'", A) === 1, "default goal effect writes a workout snapshot");

  // ── 7. Restart: new version from trend, max 1/day ───────────────────────────
  const tR = new Date(at("2026-12-11", 9));
  const rs = await restartGoal(db, A, tR);
  const after = plansOf(A).at(-1)!;
  check(rs.body.plan?.version === 3 && after.reason === "restart" && after.start_date === "2026-12-11", "restart → v3 starting today");
  check(after.start_weight_kg !== null && after.start_weight_kg < 80 && after.pace === "aggressive", "restart start = trend weight, same pace", String(after.start_weight_kg));
  let limited = false;
  try {
    await restartGoal(db, A, new Date(tR.getTime() + 1000));
  } catch (err) {
    limited = err instanceof ApiError && err.status === 429;
  }
  check(limited && plansOf(A).length === 3, "second restart same day → 429");

  // ── 8. Backfill, horizon, not onboarded ─────────────────────────────────────
  const B = "goal-b";
  s.user(B);
  s.exec("INSERT INTO weight_logs (id, user_id, kg, logged_at) VALUES ('w-b-1', ?, 84, ?), ('w-b-2', ?, 83, ?)", B, at("2026-11-05", 7), B, at("2026-11-20", 7));
  const rb = ok200(await readGoal(db, B, { now: new Date(at("2026-11-21", 9)) }));
  const pb = plansOf(B)[0];
  check(pb?.reason === "backfill" && pb.start_weight_kg === 84 && pb.start_date === START, "existing user → lazy v1 backfill (earliest log, onboarding day)");
  check(rb?.body.plan?.version === 1, "backfill body has plan v1");
  const C = "goal-c";
  s.user(C, { goalWeightKg: null });
  const rc = ok200(await readGoal(db, C, { now: new Date(at("2026-11-21", 9)) }));
  check(rc?.body.plan?.mode === "horizon" && rc.body.band.expected === null, "skipped goal weight → horizon, no ETA");
  const D = "goal-d";
  s.user(D, { onboarded: null });
  const rd = ok200(await readGoal(db, D, { now: new Date(at("2026-11-21", 9)) }));
  check(rd?.body.plan === null && rd.etag === null && plansOf(D).length === 0, "not onboarded → plan null, nothing written");

  // ── 9. Failure isolation + ownership + GoalContext ───────────────────────────
  const warn = console.warn;
  let warned = 0;
  console.warn = () => void (warned += 1);
  const broken = createDb({ prepare: () => { throw new Error("d1 down"); }, batch: async () => { throw new Error("d1 down"); } } as unknown as D1Database);
  await refreshGoalSafe(broken, A, "weight");
  console.warn = warn;
  check(warned === 1, "refreshGoalSafe swallows + logs a D1 failure");
  check(s.count("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ?", B) === 1 && plansOf(A).length === 3, "A's writes never touched B");
  const ctxA = await buildGoalContext(db, A, new Date(at("2026-12-11", 12)));
  check(!!ctxA && GoalContextSchema.safeParse(ctxA).success && ctxA.line.startsWith("Goal "), "GoalContext valid (≤600 chars)", ctxA?.line);
  check((await buildGoalContext(db, D)) === null, "no plan → GoalContext null");

  // ── 10. Account deletion cascades both tables ────────────────────────────────
  await deleteAccount(db, { deletePrefix: async () => {} } as never, A);
  check(s.count("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ?", A) === 0 && s.count("SELECT COUNT(*) n FROM goal_snapshots WHERE user_id = ?", A) === 0,
    "deleteAccount removes goal_plans + goal_snapshots");
  check(s.count("SELECT COUNT(*) n FROM goal_plans WHERE user_id = ?", B) === 1, "bystander plan kept");

  await runRouteAsserts(check, days);
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) process.exit(1);
  console.log("PASS goal-api");
};

run().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
