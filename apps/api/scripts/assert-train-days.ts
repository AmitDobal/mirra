/**
 * AMI-184: generated weeks land on the user's chosen train days. Offline (fetch stubbed).
 *   npm run test:train-days -w @mirra/api
 */
import assert from "node:assert/strict";

import { planSystemPrompt } from "../src/adapters/openai-plan-generator";
import type { MirraEnv } from "../src/env";
import { getPlanGenerator } from "../src/lib/plan-generator";
import { fitPlanToTrainDays, normalizeTrainDays, trainDaysOf } from "../src/lib/plan-train-days";
import type { GeneratedDay, PlanGenerateInput, PlanGenerateResult } from "../src/ports/plan-generator";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const WEEK = "2026-11-02"; // Monday
const NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const date = (i: number) => `2026-11-${String(2 + i).padStart(2, "0")}`;

/** A week with lifts on `liftIdx` (dayIndex, 0 = Mon), one workout per lift. */
const week = (liftIdx: number[], opts: { badDates?: boolean } = {}): PlanGenerateResult => {
  const days: GeneratedDay[] = Array.from({ length: 7 }, (_, i) => {
    const w = liftIdx.indexOf(i);
    const d = opts.badDates ? "2026-01-01" : date(i);
    return w >= 0 ? { dayIndex: i, date: d, kind: "lift", label: `L${w}`, workoutIndex: w } : { dayIndex: i, date: d, kind: "rest", label: "Rest" };
  });
  const workouts = liftIdx.map((_, w) => ({ title: `W${w}`, durationMin: 45, exercises: [{ name: "Squat", targetSets: 3, targetReps: "8" }] }));
  return { summary: { kcalTarget: 2200, proteinG: 160, carbsG: 220, fatG: 70, outcomeLine: "A steady week." }, days, workouts };
};

const liftDays = (r: PlanGenerateResult) => r.days.filter((d) => d.kind === "lift").map((d) => d.dayIndex + 1);
const titles = (r: PlanGenerateResult) => r.days.filter((d) => d.kind === "lift").map((d) => r.workouts[d.workoutIndex!]!.title);
const wellFormed = (r: PlanGenerateResult) =>
  r.days.length === 7 &&
  r.days.every((d, i) => d.dayIndex === i && d.date === date(i)) &&
  r.days.every((d) => (d.kind === "lift") === (d.workoutIndex != null)) &&
  r.days.every((d) => d.workoutIndex == null || d.workoutIndex < r.workouts.length);

const pureCases = () => {
  check(JSON.stringify(normalizeTrainDays(["Mon", "wed", 4, 4, 9, "xyz", 5])) === "[1,3,4,5]", "normalize: names + numbers, unique, sorted");
  const same = week([0, 2, 3, 4]);
  const ok = fitPlanToTrainDays(same, [1, 3, 4, 5], WEEK);
  check(ok.result === same && ok.corrections.length === 0, "already on train days → unchanged (same object)");
  check(fitPlanToTrainDays(week([5]), [], WEEK).result.days[5]!.kind === "lift", "no train days → current behaviour kept");
  check(fitPlanToTrainDays(week([5]), undefined, WEEK).corrections.length === 0, "undefined train days → no corrections");

  // QA bug: Mon/Wed/Thu/Fri chosen, model put a lift on Saturday.
  const sat = fitPlanToTrainDays(week([0, 2, 3, 5]), [1, 3, 4, 5], WEEK);
  check(JSON.stringify(liftDays(sat.result)) === "[1,3,4,5]", `Sat lift moved onto Fri (${liftDays(sat.result)})`);
  check(sat.corrections.some((c) => c.includes("Sat → Fri")), `correction logged (${sat.corrections.join("; ")})`);
  check(JSON.stringify(titles(sat.result)) === '["W0","W1","W2","W3"]', "session order kept");
  check(sat.result.days[5]!.kind === "rest" && sat.result.days[5]!.workoutIndex === undefined, "Sat becomes rest");

  // QA rebuild bug: Tue + Sun lifts for Mon/Wed/Thu/Fri.
  const tueSun = fitPlanToTrainDays(week([1, 2, 3, 6]), [1, 3, 4, 5], WEEK);
  check(JSON.stringify(liftDays(tueSun.result)) === "[1,3,4,5]" && wellFormed(tueSun.result), "Tue/Sun lifts → Mon/Fri");

  const sets: Record<string, { chosen: number[]; model: number[] }> = {
    "3-day": { chosen: [1, 3, 5], model: [1, 2, 5] },
    "4-day": { chosen: [1, 3, 4, 5], model: [0, 1, 2, 3] },
    "5-day": { chosen: [1, 2, 3, 5, 6], model: [0, 1, 2, 3, 4] },
    "6-day": { chosen: [1, 2, 3, 4, 5, 6], model: [0, 1, 2, 3, 4, 6] },
  };
  for (const [name, { chosen, model }] of Object.entries(sets)) {
    const r = fitPlanToTrainDays(week(model), chosen, WEEK).result;
    check(JSON.stringify(liftDays(r)) === JSON.stringify(chosen) && wellFormed(r), `${name}: lifts exactly on ${chosen.map((d) => NAMES[d - 1]).join("/")}`);
    check(JSON.stringify(titles(r)) === JSON.stringify(model.map((_, w) => `W${w}`)), `${name}: order kept`);
  }

  // Too many sessions: 6 generated for 3 days → 3 kept, extras dropped, workouts pruned.
  const many = fitPlanToTrainDays(week([0, 1, 2, 3, 4, 5]), [1, 3, 5], WEEK);
  check(JSON.stringify(liftDays(many.result)) === "[1,3,5]", `too many: 3 lift days (${liftDays(many.result)})`);
  check(many.result.workouts.length === 3 && wellFormed(many.result), "too many: unscheduled workouts removed + reindexed");
  check(JSON.stringify(titles(many.result)) === '["W0","W2","W4"]', `too many: sessions already on train days kept (${titles(many.result)})`);
  check(many.corrections.some((c) => c.startsWith("dropped extra session")), "too many: drop logged");

  // Fewer sessions than days: never invent a workout, never lift off-plan.
  const few = fitPlanToTrainDays(week([5, 6]), [1, 3, 4, 5], WEEK).result;
  check(liftDays(few).length === 2 && liftDays(few).every((d) => [1, 3, 4, 5].includes(d)), `fewer sessions stay on train days (${liftDays(few)})`);

  // Broken rows: duplicate dayIndex, lift without workout, wrong dates.
  const broken = week([0, 2, 3, 4], { badDates: true });
  broken.days[6] = { dayIndex: 2, date: date(2), kind: "lift", workoutIndex: 0 };
  broken.days[3] = { dayIndex: 3, date: date(3), kind: "lift" };
  const fixed = fitPlanToTrainDays(broken, [1, 3, 4, 5], WEEK).result;
  check(wellFormed(fixed), "duplicate day / lift without workout / bad dates → 7 clean rows");
  check(liftDays(fixed).every((d) => [1, 3, 4, 5].includes(d)), "broken rows: lifts still on train days");

  const twice = fitPlanToTrainDays(sat.result, [1, 3, 4, 5], WEEK);
  check(twice.corrections.length === 0, "idempotent: second pass is a no-op");
};

// ---- adapters through the factory (fetch stubbed) ----
let reply = "{}";
let lastSystem = "";
let lastUser = "";
globalThis.fetch = (async (_url: string, init: { body: string }) => {
  const body = JSON.parse(init.body) as { messages: { role: string; content: string }[] };
  lastSystem = body.messages.find((m) => m.role === "system")?.content ?? "";
  lastUser = body.messages.find((m) => m.role === "user")?.content ?? "";
  return new Response(JSON.stringify({ model: "stub", choices: [{ message: { content: reply } }] }), { status: 200 });
}) as unknown as typeof fetch;

const input = (trainDays: number[], kind: "generate" | "rebuild" = "generate"): PlanGenerateInput => ({
  userId: "u-train",
  timezone: "UTC",
  weekStart: WEEK,
  kind,
  prefsJson: JSON.stringify({ trainDays, sessionMinutes: 45, experience: "months" }),
  profileJson: JSON.stringify({ weightKg: 80 }),
});

const adapterCases = async () => {
  const heuristic = getPlanGenerator({ AI_PROVIDER: "heuristic" } as unknown as MirraEnv);
  for (const days of [[1, 3, 5], [1, 3, 4, 5], [1, 2, 3, 5, 6], [1, 2, 3, 4, 5, 6]]) {
    const r = await heuristic.generate(input(days));
    check(JSON.stringify(liftDays(r)) === JSON.stringify(days), `heuristic ${days.length}-day: ${liftDays(r)}`);
  }
  const legacy = await heuristic.generate(input([]));
  check(JSON.stringify(liftDays(legacy)) === "[1,3,5]", "heuristic without train days: Mon/Wed/Fri default kept");

  const openai = getPlanGenerator({ OPENAI_API_KEY: "stub", AI_PROVIDER: "openai" } as unknown as MirraEnv);
  reply = JSON.stringify(week([0, 2, 3, 5]));
  const gen = await openai.generate(input([1, 3, 4, 5]));
  check(gen.summary.generator === "openai", "openai stub reply accepted");
  check(JSON.stringify(liftDays(gen)) === "[1,3,4,5]", `openai wrong days (Sat) → fitted (${liftDays(gen)})`);
  check(lastSystem.includes("SCHEDULE (hard rule): lift ONLY on Mon, Wed, Thu, Fri (dayIndex 0, 2, 3, 4). Exactly 4 lift days"), "prompt names exact weekdays + count");
  check(lastUser.includes('"schedule":{"liftDays":["mon","wed","thu","fri"],"liftDayIndexes":[0,2,3,4],"sessions":4}'), "user payload carries schedule");

  reply = JSON.stringify(week([0, 1, 2, 3, 4, 5, 6]));
  const reb = await openai.generate(input([1, 3, 4, 5], "rebuild"));
  check(JSON.stringify(liftDays(reb)) === "[1,3,4,5]" && reb.workouts.length === 4, `rebuild: 7 sessions → 4 on train days (${liftDays(reb)})`);

  reply = "not json";
  const fb = await openai.generate(input([2, 4, 6]));
  check(fb.summary.generator === "heuristic" && JSON.stringify(liftDays(fb)) === "[2,4,6]", "openai error → heuristic fallback on train days");

  const ctx = { profile: { trainDays: ["tue", "sat"] } } as unknown as PlanGenerateInput["context"];
  check(JSON.stringify(trainDaysOf({ prefsJson: "{}", context: ctx })) === "[2,6]", "train days read from context envelope");
  check(!planSystemPrompt(input([])).includes("SCHEDULE (hard rule)"), "no train days → no schedule rule");
};

const main = async () => {
  pureCases();
  await adapterCases();
  assert.equal(failures, 0, `${failures} failed`);
  console.log("\nassert-train-days: all passed");
};

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
