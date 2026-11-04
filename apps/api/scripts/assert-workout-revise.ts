/**
 * AMI-166 plan chat, workout side, against the real schema (all D1 migrations, in-memory
 * SQLite): named swap / add / remove, prefer bench on a full gym, schedule moves (past and
 * logged days refused), no-match warning, gear-loss regression, and "avoid chicken" bans
 * chicken only. Heuristic reviser (no OpenAI key). Preview rows == applied rows.
 *   npm run test:workout-revise -w @mirra/api
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { CoachReviseResponse, ReviseItem } from "@mirra/contracts";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import type { AppDB } from "../src/db";
import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { filterCatalog } from "../src/lib/meal-diet";
import { newId } from "../src/lib/id";
import { applyDraft, revisePlans } from "../src/services/plan-revise";
import { hasGear } from "../src/services/workout-swaps";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  - ${detail}`}`);
  if (!ok) failures += 1;
};

// --- in-memory D1 stand-in (same harness as assert-revise-drafts) --------------
const sqlite = new DatabaseSync(":memory:");
const migrations = join(import.meta.dirname, "../src/db/migrations");
for (const f of readdirSync(migrations).filter((x) => x.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(join(migrations, f), "utf8").replaceAll("--> statement-breakpoint", ""));
}
const exec = (sql: string, params: unknown[], method: string) => {
  const stmt = sqlite.prepare(sql);
  const args = params as SQLInputValue[];
  if (method === "run") {
    stmt.run(...args);
    return { rows: [] as unknown[] };
  }
  stmt.setReturnArrays(true);
  if (method === "get") return { rows: (stmt.get(...args) as unknown[] | undefined) ?? [] };
  return { rows: stmt.all(...args) as unknown[] };
};
const db = drizzle(
  async (sql, params, method) => exec(sql, params, method) as { rows: never[] },
  async (queries) => {
    sqlite.exec("BEGIN");
    try {
      const out = queries.map((q) => exec(q.sql, q.params, q.method));
      sqlite.exec("COMMIT");
      return out as { rows: never[] }[];
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  },
  { schema },
) as unknown as AppDB;
const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;

const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const today = addDays(0);
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = (n: number) => WEEKDAY[new Date(`${addDays(n)}T00:00:00Z`).getUTCDay()]!;
const short = (n: number) => dayName(n).slice(0, 3);

// --- seed: yesterday Pull (past), today Push, +1 rest, +2 Legs, +3 Pull, +4/+5 rest ----------
type Ex = [name: string, sets: number, reps: string];
const PUSH: Ex[] = [["Incline dumbbell press", 3, "8-12"], ["Tricep Dips", 3, "8-10"], ["Cable fly", 3, "12-15"], ["Push-up", 3, "10-15"]];
const LEGS: Ex[] = [["Back squat", 4, "6-8"], ["Lunges", 3, "8-10/leg"], ["Romanian deadlift", 3, "8-10"]];
const PULL: Ex[] = [["Barbell row", 3, "8-10"], ["Lat pulldown", 3, "10-12"]];

const seedUser = async (equipment = ["full_gym"]) => {
  const userId = newId();
  const planId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.preferences).values({ userId, primaryGoal: "build_muscle", experience: "months", equipmentJson: JSON.stringify(equipment) });
  await db.insert(schema.plans).values({ id: planId, userId, version: 1, status: "ready", weekStart: addDays(-1), source: "heuristic", summaryJson: "{}" });
  const ids: Record<string, string> = {};
  for (const [i, [title, list]] of ([["Push day", PUSH], ["Legs day", LEGS], ["Pull day", PULL]] as const).entries()) {
    const id = newId();
    ids[title] = id;
    await db.insert(schema.workouts).values({ id, planId, title, durationMin: 45, focus: title === "Push day" ? "Chest" : null, sortOrder: i });
    for (const [j, [name, sets, reps]] of list.entries()) {
      await db.insert(schema.workoutExercises).values({ id: newId(), workoutId: id, name, targetSets: sets, targetReps: reps, sortOrder: j });
    }
  }
  const layout: (string | null)[] = ["Pull day", "Push day", null, "Legs day", "Pull day", null, null];
  for (const [i, title] of layout.entries()) {
    await db.insert(schema.planDays).values({
      id: newId(), planId, dayIndex: i, date: addDays(i - 1), kind: title ? "lift" : "rest",
      label: title ? title.replace(" day", "") : "Rest", workoutId: title ? ids[title]! : null,
    });
  }
  return { ctx: { env, db, userId }, ids, planId };
};
type Seed = Awaited<ReturnType<typeof seedUser>>;

const propose = (s: Seed, message: string) => revisePlans(s.ctx, { message, scope: "auto", date: today, dryRun: true });
const rowsOf = (workoutId: string) =>
  db.select().from(schema.workoutExercises).where(eq(schema.workoutExercises.workoutId, workoutId)).orderBy(asc(schema.workoutExercises.sortOrder));
const kinds = (r: CoachReviseResponse) => (r.items ?? []).map((i) => i.kind).join();
type Of<K extends ReviseItem["kind"]> = Extract<ReviseItem, { kind: K }>;
const first = <K extends ReviseItem["kind"]>(r: CoachReviseResponse, k: K) => (r.items ?? []).find((i): i is Of<K> => i.kind === k);
const dump = (r: CoachReviseResponse) => JSON.stringify({ items: r.items, warnings: r.warnings, message: r.message });

const namedSwap = async () => {
  const s = await seedUser();
  const res = await propose(s, "Replace tricep dips with skull crushers");
  const sw = first(res, "exercise_swap");
  check(kinds(res) === "exercise_swap" && Boolean(res.draftId), "replace tricep dips -> exactly one exercise_swap + draft", dump(res));
  check(sw?.before.name === "Tricep Dips" && sw.before.sets === 3 && sw.before.reps === "8-10", "before {Tricep Dips, 3, 8-10}", JSON.stringify(sw?.before));
  check(sw?.after.name === "Skull Crusher" && sw.after.sets === 3 && sw.after.reps === "8-10" && sw.after.canonicalId === "skull_crusher", "after {Skull Crusher, 3, 8-10, skull_crusher}", JSON.stringify(sw?.after));
  check(Boolean(sw?.tags.includes("Same muscles") && sw.tags.includes("Barbell") && sw.reason === "Trains triceps"), "tags Same muscles + Barbell, reason 'Trains triceps'", JSON.stringify(sw));
  check(sw?.dayLabel === `${short(0)} · Push day`, "dayLabel names today's push day", sw?.dayLabel);
  check((await rowsOf(s.ids["Push day"]!))[1]?.name === "Tricep Dips", "dry run wrote nothing");
  await applyDraft(s.ctx, res.draftId!);
  const row = (await rowsOf(s.ids["Push day"]!))[1];
  check(row?.name === sw?.after.name && row?.canonicalId === "skull_crusher" && row.targetSets === 3 && row.targetReps === "8-10", "apply: row 2 matches the preview byte for byte", JSON.stringify(row));
};

const preferBench = async () => {
  const s = await seedUser();
  const res = await propose(s, "Prefer bench press");
  const sw = first(res, "exercise_swap") ?? first(res, "exercise_add");
  check(Boolean(sw && sw.after.canonicalId === "bench_press" && sw.dayLabel.endsWith("Push day")), "full_gym + prefer bench -> bench row on push day", dump(res));
  check(!(res.items ?? []).some((i) => i.kind === "pref"), "no 'Add gear: bench' row for a full gym", kinds(res));
  await applyDraft(s.ctx, res.draftId!);
  const names = (await rowsOf(s.ids["Push day"]!)).map((r) => r.name);
  check(names.includes("Barbell Bench Press"), "apply: push day has Barbell Bench Press", names.join());
  check(hasGear(["full_gym"])("barbell") && hasGear(["full_gym"])("bench") && !hasGear(["dumbbells"])("barbell"), "hasGear expands full_gym");
};

const removeAndAdd = async () => {
  const s = await seedUser();
  const rm = await propose(s, "remove lunges");
  const item = first(rm, "exercise_remove");
  check(item?.before.name === "Lunges" && item.before.reps === "8-10/leg" && item.workoutId === s.ids["Legs day"], "remove lunges finds them on legs day", dump(rm));
  await applyDraft(s.ctx, rm.draftId!);
  check(!(await rowsOf(s.ids["Legs day"]!)).some((r) => r.name === "Lunges"), "apply: lunges gone");

  const add = await propose(s, `add face pulls to ${dayName(3)}`);
  const a = first(add, "exercise_add");
  check(a?.after.canonicalId === "face_pull" && a.workoutId === s.ids["Pull day"] && a.dayLabel === `${short(3)} · Pull day`, `add face pulls to ${dayName(3)} -> pull day`, dump(add));
  check(Boolean(a && a.tags[0] === "Cables" && a.position === 2 && a.after.sets === 3), "add: Cables tag, appended, library dose", JSON.stringify(a));
  await applyDraft(s.ctx, add.draftId!);
  const rows = await rowsOf(s.ids["Pull day"]!);
  check(rows[2]?.name === a?.after.name && rows[2]?.canonicalId === "face_pull" && rows[2]?.targetReps === a?.after.reps, "apply: face pull row matches preview", JSON.stringify(rows[2]));
};

const scheduleMoves = async () => {
  const s = await seedUser();
  const res = await propose(s, `move ${dayName(2)}'s workout to ${dayName(1)}`);
  const mv = first(res, "schedule_day_move");
  check(mv?.fromLabel === short(2) && mv.toLabel === short(1) && mv.title === "Legs day" && mv.fromDate === addDays(2), "schedule_day_move with weekday labels", dump(res));
  await applyDraft(s.ctx, res.draftId!);
  const days = await db.select().from(schema.planDays).where(eq(schema.planDays.planId, s.planId));
  const at = (n: number) => days.find((d) => d.date === addDays(n));
  check(at(1)?.workoutId === s.ids["Legs day"] && at(1)?.kind === "lift" && at(2)?.workoutId == null && at(2)?.kind === "rest", "apply: legs moved, old day is rest");

  const past = await propose(s, `move ${dayName(-1)}'s workout to ${dayName(4)}`);
  check(!first(past, "schedule_day_move") && (past.warnings ?? []).some((w) => /passed/.test(w)), "past day -> warning, no item", dump(past));

  await db.insert(schema.workoutSessions).values({ id: newId(), userId: s.ctx.userId, workoutId: s.ids["Pull day"], startedAt: new Date(`${addDays(3)}T12:00:00Z`) });
  const logged = await propose(s, `move ${dayName(3)}’s workout to ${dayName(4)}`);
  check(!first(logged, "schedule_day_move") && (logged.warnings ?? []).some((w) => w.includes(`logged a session on ${short(3)}`)), "logged day -> warning naming the day (curly apostrophe ok)", dump(logged));
};

const noMatchAndGear = async () => {
  const s = await seedUser();
  const res = await propose(s, "replace bulgarian split squats with leg press");
  const w = (res.warnings ?? []).join(" | ");
  check((res.items ?? []).length === 0 && w.includes("No 'bulgarian split squats' in") && w.includes("Your moves: Incline dumbbell press, Tricep Dips"), "no match -> warning lists the user's moves", w);
  check(!/couldn't map/.test(res.message), "never 'couldn't map' for a named swap", res.message);

  const g = await seedUser();
  const cab = await propose(g, "no cable machines");
  const sw = first(cab, "exercise_swap");
  check(sw?.before.name === "Cable fly" && /fly/i.test(sw.after.name) && !/cable/i.test(sw.after.name), "gear loss: cable fly swapped (full_gym expands)", dump(cab));
  check((cab.items ?? []).some((i) => i.kind === "pref" && i.op === "equipment_remove"), "gear loss keeps the Remove gear row");
};

const avoidChickenOnly = () => {
  const ids = (diet: string[], avoid: string | null) => new Set(filterCatalog(diet, avoid, []).map((f) => f.id));
  const chicken = ids([], "chicken");
  check(!chicken.has("chicken_breast_cooked") && chicken.has("turkey_breast_cooked") && chicken.has("lean_beef_cooked"), "avoid chicken bans chicken only (turkey + beef stay)");
  const meat = ids([], "meat");
  check(!meat.has("turkey_breast_cooked") && !meat.has("chicken_breast_cooked"), "'no meat' stays broad");
  const veg = ids(["vegetarian"], null);
  check(!veg.has("turkey_breast_cooked") && !veg.has("lean_beef_cooked"), "vegetarian stays broad");
};

/** AMI-173 QA: a workout name + relative day moves the day; an explicit swap is one row. */
const qaRegressions = async () => {
  const s = await seedUser();
  const mv = await propose(s, "move legs to tomorrow");
  const m = first(mv, "schedule_day_move");
  check(m?.title === "Legs day" && m.fromDate === addDays(2) && m.toDate === addDays(1) && !/needed changing/.test(mv.message), "'move legs to tomorrow' -> Legs day moves to tomorrow", dump(mv));
  await applyDraft(s.ctx, mv.draftId!);
  const days = await db.select().from(schema.planDays).where(eq(schema.planDays.planId, s.planId));
  check(days.find((d) => d.date === addDays(1))?.workoutId === s.ids["Legs day"], "apply: tomorrow is legs");

  const b = await seedUser();
  await db.insert(schema.workoutExercises).values({ id: newId(), workoutId: b.ids["Push day"]!, name: "Bench press", targetSets: 4, targetReps: "6-8", sortOrder: 9 });
  const sw = await propose(b, "replace bench press with dumbbell bench press");
  const one = first(sw, "exercise_swap");
  check(kinds(sw) === "exercise_swap" && one?.before.name === "Bench press" && one.after.canonicalId === "dumbbell_bench_press" && one.after.sets === 4,
    "'replace bench press with dumbbell bench press' -> exactly one swap to Dumbbell Bench Press", dump(sw));
  check(!sw.intent?.preferBench && (sw.intent?.preferExercises ?? []).length === 0, "explicit swap suppresses prefer-bench", JSON.stringify(sw.intent));
  await applyDraft(b.ctx, sw.draftId!);
  const names = (await rowsOf(b.ids["Push day"]!)).map((r) => r.name);
  check(names.includes("Dumbbell Bench Press") && !names.some((n) => /^(?:bench press|barbell bench press|smith)/i.test(n)), "apply: bench row is Dumbbell Bench Press", names.join());

  const g = await seedUser(["dumbbells", "cables", "bench"]);
  await db.insert(schema.workoutExercises).values({ id: newId(), workoutId: g.ids["Push day"]!, name: "Bench press", targetSets: 4, targetReps: "6-8", sortOrder: 9 });
  const both = await propose(g, "prefer bench press, replace bench press with dumbbell bench press");
  const swaps = (both.items ?? []).filter((i) => i.kind === "exercise_swap");
  const chained = swaps.some((x) => swaps.some((y) => x !== y && x.kind === "exercise_swap" && y.kind === "exercise_swap" && x.after.name === y.before.name));
  check(!chained && swaps.length === 1, "gear-loss + named swap on one slot -> one row, never chained", dump(both));
};

const main = async () => {
  await qaRegressions();
  await namedSwap();
  await preferBench();
  await removeAndAdd();
  await scheduleMoves();
  await noMatchAndGear();
  avoidChickenOnly();
  process.exit(failures === 0 ? 0 : 1);
};
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
