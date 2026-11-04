import { CUISINE_STYLE_IDS, personaPromptBlock } from "@mirra/contracts";
import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { EQUIPMENT_IDS, hasAnyIntent, sanitizeIntent } from "../lib/plan-intent";
import type { PlanReviser, PlanReviseInput, PlanReviseResult } from "../ports/plan-reviser";
import { heuristicPlanReviser } from "./heuristic-plan-reviser";
import { chatCompletion } from "./openai-client";

const str = { type: "string" } as const;
const strs = { type: "array", items: str } as const;
const nullable = (t: string) => ({ type: [t, "null"] });
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

/** Strict structured output: every key required, optional values are null. */
const REPLY_JSON_SCHEMA = obj({
  reply: str,
  warnings: strs,
  intent: obj({
    equipmentAdd: strs,
    equipmentRemove: strs,
    foodsAvoidAdd: strs,
    dietTagsAdd: strs,
    cuisineStylesAdd: strs,
    cuisineStylesOnly: nullable("boolean"),
    forceMealRegen: { type: "boolean" },
    reviseWorkout: { type: "boolean" },
    shortenMin: nullable("number"),
    mealsPerDay: nullable("number"),
    mealSlots: { type: "array", items: { type: "string", enum: ["breakfast", "lunch", "snack", "dinner"] } },
    mealBias: { type: ["string", "null"], enum: ["high_protein", "low_carb", "lighter", null] },
    exerciseSwaps: { type: "array", items: obj({ from: str, to: nullable("string") }) },
    exerciseAdds: { type: "array", items: obj({ name: str, sets: nullable("number"), reps: nullable("string") }) },
    exerciseRemoves: strs,
    preferExercises: strs,
    scheduleMoves: { type: "array", items: obj({ from: str, to: str }) },
    reasons: { type: "array", items: obj({ key: str, text: str }) },
  }),
});

const nul = <T extends z.ZodTypeAny>(t: T) => t.nullish().transform((v) => v ?? undefined);

const ReplySchema = z.object({
  reply: z.string().min(1).max(400),
  intent: z.object({
    equipmentAdd: z.array(z.string()).default([]),
    equipmentRemove: z.array(z.string()).default([]),
    foodsAvoidAdd: z.array(z.string()).default([]),
    dietTagsAdd: z.array(z.string()).default([]),
    cuisineStylesAdd: z.array(z.string()).default([]),
    cuisineStylesOnly: nul(z.boolean()),
    forceMealRegen: z.boolean().default(false),
    reviseWorkout: z.boolean().default(false),
    shortenMin: nul(z.number()),
    mealsPerDay: nul(z.number()),
    mealSlots: z.array(z.enum(["breakfast", "lunch", "snack", "dinner"])).default([]),
    mealBias: nul(z.enum(["high_protein", "low_carb", "lighter"])),
    exerciseSwaps: z.array(z.object({ from: z.string(), to: z.string().nullable() })).default([]),
    exerciseAdds: z
      .array(z.object({ name: z.string(), sets: nul(z.number()), reps: nul(z.string()) }))
      .default([]),
    exerciseRemoves: z.array(z.string()).default([]),
    preferExercises: z.array(z.string()).default([]),
    scheduleMoves: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
    reasons: z.array(z.object({ key: z.string(), text: z.string() })).default([]),
  }),
  warnings: z.array(z.string()).default([]),
});

const SYSTEM = `You are Mirra's plan editor. Convert the user's chat message into a STRICT JSON edit of their EXISTING meal plan and workout plan. Never invent a new plan. Unused optional fields are null or [].
Rules:
- Equipment ids only: ${EQUIPMENT_IDS.join(", ")}. "no cable machines" -> equipmentRemove ["cables"]. "only dumbbells" -> equipmentRemove ["machines","cables","barbell","bands"], equipmentAdd ["dumbbells"].
- foodsAvoidAdd: single lowercase food words (dairy, chicken, nuts, gluten...). dietTagsAdd only from: vegetarian, vegan, dairy_free, gluten_free, halal, high_protein.
- cuisineStylesAdd ids only from: ${CUISINE_STYLE_IDS.join(", ")}. "prefer Indian food" -> ["indian"]; "only Chinese" -> ["chinese"] with cuisineStylesOnly true. Also set forceMealRegen true.
- mealSlots: the meal slots the user names ("swap my lunch" -> ["lunch"]). Then forceMealRegen stays false. Only set forceMealRegen for whole-day asks ("new meals today").
- mealBias: "more protein" -> high_protein, "fewer carbs" -> low_carb, "lighter" -> lighter. It is a one-off pick hint, never a dietTagsAdd.
- mealsPerDay: integer 1-4 when the user says how often they eat ("I only eat two times a day" -> 2). Do NOT set forceMealRegen for this. Never invent a number the user did not say.
- Exercises: names must come from current.exercises when the user refers to one. "replace X with Y" -> exerciseSwaps [{from:X,to:Y}] with Y exactly as the user said it, gear words kept ("replace bench press with dumbbell bench press" -> {from:"bench press",to:"dumbbell bench press"}); to null when unspecified. "add X" -> exerciseAdds. "drop X" -> exerciseRemoves. "prefer bench press" -> preferExercises ["bench press"].
- An explicit swap owns its lifts: never also list X or Y in preferExercises, and never return two swaps for the same exercise.
- scheduleMoves: move a planned workout to another day. from = the day it is on now, or the workout name the user used ("legs", "push", "upper body"). to = the day it should go to. Use the YYYY-MM-DD date from current.schedule when you can tell it, else a weekday name, "today", "tomorrow", "next monday" or "weekend". "move legs to tomorrow" -> [{from:"legs",to:"<tomorrow's date>"}]. "move Tuesday's workout to Thursday" -> [{from:"tuesday",to:"thursday"}]. Keep each value under 16 characters.
- reasons: optional short why per edit, key = slot or exercise name, text max 80 chars.
- Use current.meals, current.nutrition (goal, kcal and protein targets, lifestyle notes) and current.mealsPerDay to judge what is possible.
- reviseWorkout true whenever equipment, exercises or session length changes. shortenMin = target minutes (10-90).
- Do not add anything the user did not ask for. If the message asks for nothing actionable, return empty intent and say what you can change.
- One message can ask for several edits ("swap my lunch and replace X with Y, no chicken"): return ALL of them. Any part you cannot map goes in warnings as "I couldn't map \"<part>\" to a plan change".
- reply: one sentence in the voice of PERSONA, max 30 words, no numbers you were not given. PERSONA changes the reply wording only, never the intent.
- Never use em dashes or semicolons. Prefer short sentences.`;

const buildUserPayload = (input: PlanReviseInput): string =>
  JSON.stringify({
    PERSONA: personaPromptBlock(input.persona),
    message: input.message.slice(0, 2000),
    scope: input.scope,
    current: {
      equipment: input.equipment,
      dietTags: input.dietTags,
      foodsAvoid: input.foodsAvoid,
      cuisineStyles: input.cuisineStyles,
      workout: input.workoutTitle,
      today: input.today ?? null,
      schedule: (input.schedule ?? []).slice(0, 14),
      exercises: (input.exercises ?? input.exerciseNames.map((name) => ({ name, sets: null, reps: null })))
        .slice(0, 12)
        .map((e) => ({ name: e.name, sets: e.sets, reps: e.reps })),
      mealsPerDay: input.mealsPerDay,
      meals: input.meals.slice(0, 6).map((m) => ({ slot: m.slot, title: m.title.slice(0, 60), kcal: m.kcal, status: m.status })),
      nutrition: {
        goal: input.nutrition.goal,
        kcalTarget: input.nutrition.kcalTarget,
        proteinGTarget: input.nutrition.proteinGTarget,
        lifestyleNotes: input.nutrition.lifestyleNotes?.slice(0, 400) ?? null,
      },
    },
  });

/** OpenAI PlanReviser (strict JSON intent); falls back to heuristic on any failure. */
export const createOpenAiPlanReviser = (env: MirraEnv, db?: AppDB): PlanReviser => ({
  propose: async (input): Promise<PlanReviseResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return heuristicPlanReviser.propose(input);
    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonSchema: { name: "plan_revise", schema: REPLY_JSON_SCHEMA },
        temperature: 0.2,
        maxTokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildUserPayload(input) },
        ],
      });
      await logAiUsage({
        db,
        userId: input.userId,
        action: "openai.plan.revise",
        feature: "revise",
        model: completion.model,
        usage: completion.usage,
      });
      const parsed = ReplySchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn("[openai-reviser] fallback to heuristic: schema", parsed.error.issues[0]?.message);
        return heuristicPlanReviser.propose(input);
      }
      const { reasons, ...raw } = parsed.data.intent;
      const intent = sanitizeIntent({
        ...raw,
        exerciseAdds: raw.exerciseAdds.map((a) => ({ name: a.name, sets: a.sets, reps: a.reps })),
        reasons: Object.fromEntries(reasons.map((r) => [r.key, r.text])),
      });
      if (!hasAnyIntent(intent)) {
        // Model found nothing; let the rules take a pass before giving up.
        const rules = await heuristicPlanReviser.propose(input);
        if (hasAnyIntent(rules.intent)) return rules;
      }
      return { intent, reply: parsed.data.reply, warnings: parsed.data.warnings.slice(0, 3), source: "openai" };
    } catch (err) {
      console.warn("[openai-reviser] fallback to heuristic:", err instanceof Error ? err.message : String(err));
      return heuristicPlanReviser.propose(input);
    }
  },
});
