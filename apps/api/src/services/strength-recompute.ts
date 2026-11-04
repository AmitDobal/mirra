/**
 * Strength recompute on workout complete (arch §6.3). Inline in the Worker, never fails
 * the request. Round trips: context, session sets, (name resolve), (backfill), reads, writes.
 */
import type { TierChange } from "@mirra/contracts";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { STANDARDS_VERSION } from "../data/strength-standards";
import type { AppDB } from "../db";
import { exerciseScores, muscleScores, setLogs, strengthEvents, strengthSummary, workoutExercises, workoutSessions } from "../db/schema";
import { newId } from "../lib/id";
import { diffSteps, rollup, type Rollup, type StepEvent } from "../lib/strength/rollup";
import { scoreSession, type ExerciseScoreRow, type SessionSet } from "../lib/strength/session";
import { resolveExerciseNames } from "./exercise-resolve";
import {
  loadStrengthContext,
  selectExerciseScores,
  selectMuscleScores,
  selectSets90d,
  selectSummary,
  snapshotOf,
  toCountMap,
  toScoreRow,
} from "./strength-store";

type Item = BatchItem<"sqlite">;

/** D1 binds at most 100 params per statement. */
const chunk = <T>(xs: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

const runBatch = async (db: AppDB, items: Item[]): Promise<void> => {
  if (items.length) await db.batch(items as [Item, ...Item[]]);
};

/** Session sets with canonical ids; null ids are resolved (plan row → library/cache) and backfilled. */
const loadSessionSets = async (db: AppDB, userId: string, sessionId: string): Promise<SessionSet[]> => {
  const rows = await db
    .select({
      id: setLogs.id,
      name: setLogs.exerciseName,
      canonicalId: setLogs.canonicalId,
      planCanonical: workoutExercises.canonicalId,
      weightKg: setLogs.weightKg,
      reps: setLogs.reps,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(setLogs.sessionId, workoutSessions.id))
    .leftJoin(workoutExercises, eq(setLogs.exerciseId, workoutExercises.id))
    .where(and(eq(setLogs.sessionId, sessionId), eq(workoutSessions.userId, userId), eq(setLogs.completed, true)));

  const names = rows.filter((r) => !r.canonicalId && !r.planCanonical).map((r) => r.name);
  const { byName } = names.length ? await resolveExerciseNames({ db, names }) : { byName: new Map() };
  const withIds = rows.map((r) => ({
    ...r,
    resolved: r.canonicalId ?? r.planCanonical ?? byName.get(r.name.trim())?.canonicalId ?? null,
  }));

  const fills = new Map<string, string[]>();
  for (const r of withIds) if (!r.canonicalId && r.resolved) fills.set(r.resolved, [...(fills.get(r.resolved) ?? []), r.id]);
  const owned = db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));
  await runBatch(
    db,
    [...fills].flatMap(([cid, ids]) =>
      chunk(ids, 80).map((part) =>
        db.update(setLogs).set({ canonicalId: cid }).where(and(inArray(setLogs.sessionId, owned), inArray(setLogs.id, part))),
      ),
    ),
  );
  return withIds.flatMap((r) => (r.resolved ? [{ canonicalId: r.resolved, weightKg: r.weightKg, reps: r.reps }] : []));
};

const excluded = (col: string) => sql.raw(`excluded.${col}`);

const writeItems = (
  db: AppDB,
  userId: string,
  sessionId: string,
  updated: ReadonlyMap<string, ExerciseScoreRow>,
  next: Rollup,
  events: readonly StepEvent[],
  now: Date,
): Item[] => {
  const items: Item[] = [];
  const exRows = [...updated.values()].map((r) => ({ ...r, userId, standardsVersion: STANDARDS_VERSION, updatedAt: now }));
  for (const part of chunk(exRows, 7)) {
    items.push(
      db
        .insert(exerciseScores)
        .values(part)
        .onConflictDoUpdate({
          target: [exerciseScores.userId, exerciseScores.exerciseId],
          set: {
            sustainedPct: excluded("sustained_pct"),
            bestPct: excluded("best_pct"),
            lastSessionPct: excluded("last_session_pct"),
            bestE1rmKg: excluded("best_e1rm_kg"),
            bestWeightKg: excluded("best_weight_kg"),
            bestReps: excluded("best_reps"),
            sessions: excluded("sessions"),
            displayStep: excluded("display_step"),
            belowCount: excluded("below_count"),
            standardsVersion: excluded("standards_version"),
            updatedAt: excluded("updated_at"),
          },
        }),
    );
  }
  items.push(db.delete(muscleScores).where(eq(muscleScores.userId, userId)));
  const mRows = [...next.muscles].map(([muscleId, m]) => ({
    userId,
    muscleId,
    pct: m.pct,
    displayStep: m.step,
    contributorsJson: JSON.stringify(m.contributors),
    updatedAt: now,
  }));
  for (const part of chunk(mRows, 9)) items.push(db.insert(muscleScores).values(part));
  const summary = {
    overallPct: next.overall?.pct ?? null,
    overallStep: next.overall?.step ?? null,
    groupsJson: JSON.stringify([...next.groups].map(([id, g]) => ({ id, pct: g.pct, step: g.step }))),
    rankedExercises: next.unlock.ranked,
    groupsCovered: next.unlock.groups,
    updatedAt: now,
  };
  items.push(
    db.insert(strengthSummary).values({ userId, ...summary }).onConflictDoUpdate({ target: strengthSummary.userId, set: summary }),
  );
  const eRows = events.map((e) => ({ id: newId(), userId, sessionId, ...e, createdAt: now }));
  for (const part of chunk(eRows, 10)) items.push(db.insert(strengthEvents).values(part));
  return items;
};

export const recomputeStrength = async (
  db: AppDB,
  userId: string,
  sessionId: string,
  nowMs: number = Date.now(),
): Promise<TierChange[]> => {
  const ctx = await loadStrengthContext(db, userId);
  const sets = await loadSessionSets(db, userId, sessionId);
  if (ctx.bw == null || !sets.length) return [];

  const [scoreRows, muscleRows, summaryRows, countRows] = await db.batch([
    selectExerciseScores(db, userId),
    selectMuscleScores(db, userId),
    selectSummary(db, userId),
    selectSets90d(db, userId, nowMs),
  ]);
  const prevScores = new Map(scoreRows.map((r) => [r.exerciseId, toScoreRow(r)]));
  const updated = scoreSession({ sets, prev: prevScores, sex: ctx.sex, bw: ctx.bw });
  if (!updated.size) return [];

  const merged = new Map(prevScores);
  for (const [id, row] of updated) merged.set(id, row);
  const prevSnap = snapshotOf(muscleRows, summaryRows[0]);
  const next = rollup(merged, toCountMap(countRows), prevSnap);
  const { events, changes } = diffSteps(prevScores, updated, prevSnap, next);
  await runBatch(db, writeItems(db, userId, sessionId, updated, next, events, new Date(nowMs)));
  return changes;
};

/** Never throws: a recompute failure is logged and completion still succeeds. */
export const recomputeStrengthSafe = async (db: AppDB, userId: string, sessionId: string): Promise<TierChange[]> => {
  const started = Date.now();
  try {
    const changes = await recomputeStrength(db, userId, sessionId);
    console.log("[strength-recompute]", JSON.stringify({ sessionId, changes: changes.length, ms: Date.now() - started }));
    return changes;
  } catch (err) {
    console.error("[strength-recompute] failed", sessionId, err);
    return [];
  }
};
