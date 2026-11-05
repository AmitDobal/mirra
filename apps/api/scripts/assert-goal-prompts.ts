/**
 * AMI-181 prompt snapshots (offline, fetch stubbed): every OpenAI adapter that gets a goal
 * sends the goal block + GOAL_PROMPT_RULES, omits them without a goal, and the banned-word
 * guard swaps unsafe AI copy for safe copy. Heuristic goal templates stay clean.
 *   npm run test:context -w @mirra/api   (runs after assert-personalization-context)
 */
import { findBannedGoalWords, GOAL_PROMPT_RULES, type ContextEnvelope, type PlannedMeal } from "@mirra/contracts";

import { createOpenAiCoachAdvisor } from "../src/adapters/openai-coach-advisor";
import { heuristicCoachAdvisor } from "../src/adapters/heuristic-coach-advisor";
import { heuristicPlanGenerator } from "../src/adapters/heuristic-plan-generator";
import { createOpenAiMealPlanGenerator } from "../src/adapters/openai-meal-plan-generator";
import { createOpenAiPlanGenerator } from "../src/adapters/openai-plan-generator";
import { createOpenAiPlanReviser } from "../src/adapters/openai-plan-reviser";
import { createOpenAiRecipeChat } from "../src/adapters/openai-recipe-chat";
import { toCatalogRow, VETTED_FOODS } from "../src/data/vetted-foods";
import type { MirraEnv } from "../src/env";
import type { PlanReviseInput } from "../src/ports/plan-reviser";
import { goalDatesOk, heuristicGoalNote } from "../src/services/goal-copy";
import { buildContextEnvelope } from "../src/services/personalization-context";
import { FIXTURE_LINE, fixtureGoalContext, noTargetGoal, withStatus } from "./lib/goal-context-fixture";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

type Sent = { system: string; user: string };
let sent: Sent[] = [];
let reply = "{}";
globalThis.fetch = (async (_url: string, init: { body: string }) => {
  const body = JSON.parse(init.body) as { messages: { role: string; content: string }[] };
  const system = body.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const user = body.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  sent.push({ system, user });
  return new Response(JSON.stringify({ model: "stub", choices: [{ message: { content: reply } }] }), { status: 200 });
}) as unknown as typeof fetch;

const env = { OPENAI_API_KEY: "stub-key" } as unknown as MirraEnv;
const goal = fixtureGoalContext();
const last = () => sent.at(-1) ?? { system: "", user: "" };
const hasBlock = (s: Sent, line: string) => s.system.includes(GOAL_PROMPT_RULES) && (s.user.includes(line) || s.system.includes(line));

const prefs = {
  userId: "u1", primaryGoal: "lose_fat", experience: "months", equipmentJson: '["full_gym"]', trainDaysJson: "[1,2,4,5]",
  sessionMinutes: 45, dietTagsJson: "[]", foodsAvoid: null, cuisineJson: "[]", units: "metric", trainerPersona: "drill",
  physiqueTarget: null, lifestyleNotes: null, mealsPerDay: null, updatedAt: new Date(0),
};
const profile = {
  userId: "u1", sex: "male", ageYears: 29, heightCm: 180, weightKg: 82, goalWeightKg: 75, pace: "steady", timezone: "UTC",
  onboardingCompletedAt: new Date(0), createdAt: new Date(0), updatedAt: new Date(0),
};
const envelope = (feature: ContextEnvelope["feature"], withGoal = true) =>
  buildContextEnvelope({ prefs, profile, goal: withGoal ? goal : null } as never, { userId: "u1", feature, localDate: "2026-12-09" });

const week = (kcal: number) => JSON.stringify({
  summary: { kcalTarget: kcal, proteinG: 170, carbsG: 300, fatG: 70, outcomeLine: "This week will lose you 2 kg, guaranteed." },
  days: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, date: `2026-12-${String(7 + i).padStart(2, "0")}`, kind: i % 2 ? "rest" : "lift", ...(i % 2 ? {} : { workoutIndex: 0 }) })),
  workouts: [{ title: "Full body", durationMin: 45, exercises: [{ name: "Squat", targetSets: 3, targetReps: "8" }] }],
});

const planCases = async () => {
  const context = await envelope("workout_plan");
  const input = { userId: "u1", timezone: "UTC", weekStart: "2026-12-07", prefsJson: "{}", profileJson: "{}", kind: "generate" as const, context };
  reply = week(3000);
  const out = await createOpenAiPlanGenerator(env).generate(input);
  check(hasBlock(last(), FIXTURE_LINE), "plan generator: goal rules + goal line in prompt");
  check(last().system.includes("within +-8 % of profile.goalKcalHint"), "plan generator: kcal rule in system prompt");
  check(last().user.includes('"goalKcalHint":2250'), "plan generator: goalKcalHint in user payload");
  check(out.summary.kcalTarget === 2430, `plan generator: kcal clamped to +8 % of hint (${out.summary.kcalTarget})`);
  check(findBannedGoalWords(out.summary.outcomeLine).length === 0, `plan generator: banned outcomeLine replaced (${out.summary.outcomeLine})`);
  const h = await heuristicPlanGenerator.generate(input);
  check(Math.abs(h.summary.kcalTarget - 2250) <= 225, `heuristic plan: kcal from goal hint (${h.summary.kcalTarget})`);
  await createOpenAiPlanGenerator(env).generate({ ...input, context: await envelope("workout_plan", false) });
  check(!last().system.includes(GOAL_PROMPT_RULES), "plan generator: no goal → no goal rules");
};

const mealCases = async () => {
  const catalog = VETTED_FOODS.slice(0, 20).map(toCatalogRow);
  const macros = { kcal: 2250, proteinG: 170, carbsG: 220, fatG: 70 };
  const input = { userId: "u1", date: "2026-12-09", targets: macros, remaining: macros, slots: ["lunch" as const], catalog, avoidFoodIds: [], recentFoodIds: [] };
  reply = "{}";
  await createOpenAiMealPlanGenerator(env).generate({ ...input, goal: { line: goal.line, status: goal.status } });
  check(hasBlock(last(), FIXTURE_LINE), "meal plan generator: goal rules + goal line in prompt");
  await createOpenAiMealPlanGenerator(env).generate(input);
  check(!last().system.includes(GOAL_PROMPT_RULES), "meal plan generator: no goal → no goal rules");
};

const coachCases = async () => {
  const input = { userId: "u1", status: "done", goal };
  reply = JSON.stringify({ message: "Great session. On track for around Feb 18 if you keep this up.", rebuildSuggested: false });
  const ok = await createOpenAiCoachAdvisor(env).advise(input);
  check(hasBlock(last(), FIXTURE_LINE) && last().user.includes('"etaExpected":"2027-02-18"'), "coach: goal rules + GoalContext in prompt");
  check(ok.source === "openai" && ok.message.includes("Feb 18"), "coach: clean AI reply kept");
  reply = JSON.stringify({ message: "You will lose 7 kg by Feb 18, guaranteed.", rebuildSuggested: false });
  const bad = await createOpenAiCoachAdvisor(env).advise(input);
  check(bad.source === "heuristic" && findBannedGoalWords(bad.message).length === 0, `coach: banned reply → safe heuristic (${bad.message})`);
  reply = JSON.stringify({ message: "Nice work. Weigh in on Nov 5 and you hit 75 around Feb 18.", rebuildSuggested: false });
  const invented = await createOpenAiCoachAdvisor(env).advise(input);
  check(invented.source === "heuristic", `coach: invented date → safe heuristic (${invented.message})`);
  reply = JSON.stringify({ message: "Pathetic. You have done nothing, soldier.", rebuildSuggested: false });
  check((await createOpenAiCoachAdvisor(env).advise(input)).source === "heuristic", "coach: shaming reply → safe heuristic");
  check(!last().user.includes('"date":"2026-12-10"'), "coach: milestone date withheld (ETA is the only date)");
  check(goalDatesOk("Around Feb 18.", goal) && goalDatesOk("Around February 18th.", goal) && goalDatesOk("No date here, you may 2x it.", goal), "date guard: ETA and no-date text pass");
  check(!goalDatesOk("Around Feb 18 or Mar 6.", goal) && !goalDatesOk("By 2027-01-02.", goal), "date guard: second or foreign date fails");
  check(goalDatesOk("Marinate 10 minutes. Decrease 5 kg.", goal), "date guard: month-like words are not dates");
  await createOpenAiCoachAdvisor(env).advise({ userId: "u1", status: "done", goal: null });
  check(!last().system.includes(GOAL_PROMPT_RULES) && !last().user.includes("goal"), "coach: no goal → no goal block");

  for (const status of ["on_track", "ahead", "behind", "calibrating"] as const) {
    const g = withStatus(goal, status);
    const msg = (await heuristicCoachAdvisor.advise({ userId: "u1", status: "skipped", goal: g })).message;
    check(findBannedGoalWords(msg).length === 0, `heuristic coach ${status}: no banned words`);
    check((msg.match(/around/g) ?? []).length <= 1, `heuristic coach ${status}: ETA at most once`);
  }
  check(/^One step for today: /.test(heuristicGoalNote(withStatus(goal, "behind")) ?? ""), "heuristic behind: one concrete action");
  check(heuristicGoalNote(withStatus(goal, "calibrating")) === "The estimate firms up after two weeks of weigh-ins.", "heuristic calibrating line");
  check(heuristicGoalNote(noTargetGoal(goal)) === null && heuristicGoalNote(null) === null, "heuristic: no target / no goal → no goal sentence");
};

const reviserCases = async () => {
  const input: PlanReviseInput = {
    userId: "u1", message: "make this plan fit my goal better somehow", scope: "auto", equipment: [], dietTags: [], foodsAvoid: null,
    cuisineStyles: [], workoutTitle: null, exerciseNames: [], mealsPerDay: null, meals: [],
    nutrition: { goal: "lose_fat", kcalTarget: 2257, proteinGTarget: 170, lifestyleNotes: null }, goal,
  };
  reply = JSON.stringify({ reply: "I promise this gets you there by Feb 1.", warnings: [], intent: { mealSlots: ["lunch"], mealBias: "high_protein" } });
  const out = await createOpenAiPlanReviser(env).propose(input);
  check(hasBlock(last(), FIXTURE_LINE), "reviser: goal rules + GoalContext in prompt");
  check(last().system.includes("never states a date"), "reviser: no-date reply rule");
  check(findBannedGoalWords(out.reply).length === 0, `reviser: banned reply → safe copy (${out.reply})`);
};

const chefCases = async () => {
  const meal = { id: "m1", slot: "lunch", title: "Chicken rice bowl", kcal: 650, proteinG: 50, carbsG: 70, fatG: 15, items: [{ name: "chicken breast", grams: 180 }] } as unknown as PlannedMeal;
  const rules = { forbiddenTerms: [], allowed: [] } as never;
  const input = { userId: "u1", envelope: await envelope("recipe_chat"), meal, rules, maxOutputTokens: 200, message: "how do I cook it", history: [] };
  reply = "Sear the chicken 4 minutes a side. This bowl will guarantee results.";
  const out = await createOpenAiRecipeChat(env).chat(input);
  check(hasBlock(last(), "Goal fat loss · on track · around Feb 18"), "chef: goal rules + weight-free line in prompt");
  check(!/\bkg\b|82|75|79\.6/.test(last().system.split("Context:")[1] ?? ""), "chef: context carries no weights");
  check(out.reply === "Sear the chicken 4 minutes a side.", `chef: banned sentence dropped (${out.reply})`);
  reply = JSON.stringify({ prepMinutes: 5, cookMinutes: 10, steps: ["Season.", "Sear."] });
  await createOpenAiRecipeChat(env).recipe(input);
  check(hasBlock(last(), "Goal fat loss"), "chef recipe: goal rules in prompt");
};

const main = async () => {
  await planCases();
  await mealCases();
  await coachCases();
  await reviserCases();
  await chefCases();
  sent = [];
  if (failures) {
    console.error(`\n${failures} failed`);
    process.exit(1);
  }
  console.log("\nassert-goal-prompts: all passed");
};

void main();
