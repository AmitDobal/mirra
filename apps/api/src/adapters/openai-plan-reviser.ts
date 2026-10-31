import { CUISINE_STYLE_IDS, personaPromptBlock } from "@mirra/contracts";
import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { EQUIPMENT_IDS, hasAnyIntent, sanitizeIntent } from "../lib/plan-intent";
import type { PlanReviser, PlanReviseInput, PlanReviseResult } from "../ports/plan-reviser";
import { heuristicPlanReviser } from "./heuristic-plan-reviser";
import { chatCompletion } from "./openai-client";

const ReplySchema = z.object({
  reply: z.string().min(1).max(400),
  intent: z.object({
    equipmentAdd: z.array(z.string()).default([]),
    equipmentRemove: z.array(z.string()).default([]),
    foodsAvoidAdd: z.array(z.string()).default([]),
    dietTagsAdd: z.array(z.string()).default([]),
    cuisineStylesAdd: z.array(z.string()).default([]),
    cuisineStylesOnly: z.boolean().optional(),
    forceMealRegen: z.boolean().default(false),
    reviseWorkout: z.boolean().default(false),
    preferBench: z.boolean().optional(),
    shortenMin: z.number().optional(),
  }),
  warnings: z.array(z.string()).default([]),
});

const SYSTEM = `You are Mirra's plan editor. Convert the user's chat message into a STRICT JSON edit of their EXISTING meal plan and workout plan. Never invent a new plan.
Reply JSON: {"reply":string,"intent":{"equipmentAdd":string[],"equipmentRemove":string[],"foodsAvoidAdd":string[],"dietTagsAdd":string[],"cuisineStylesAdd":string[],"cuisineStylesOnly"?:boolean,"forceMealRegen":boolean,"reviseWorkout":boolean,"preferBench"?:boolean,"shortenMin"?:number},"warnings":string[]}
Rules:
- Equipment ids only: ${EQUIPMENT_IDS.join(", ")}. "no cable machines" -> equipmentRemove ["cables"]. "only dumbbells" -> equipmentRemove ["machines","cables","barbell","bands"], equipmentAdd ["dumbbells"]. "prefer bench press" -> preferBench true, equipmentAdd ["bench"].
- foodsAvoidAdd: single lowercase food words (dairy, chicken, nuts, gluten...). dietTagsAdd only from: vegetarian, vegan, dairy_free, gluten_free, halal, high_protein.
- cuisineStylesAdd ids only from: ${CUISINE_STYLE_IDS.join(", ")}. "prefer Indian food" -> ["indian"]; "only Chinese" -> ["chinese"] with cuisineStylesOnly true. Also set forceMealRegen true.
- reviseWorkout true whenever equipment, bench preference or session length changes. shortenMin = target minutes (10-90).
- forceMealRegen true when the user asks for different/new meals.
- Do not add anything the user did not ask for. If the message asks for nothing actionable, return empty intent and say what you can change.
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
      exercises: input.exerciseNames.slice(0, 12),
    },
  });

/** OpenAI PlanReviser (JSON intent); falls back to heuristic on any failure. */
export const createOpenAiPlanReviser = (env: MirraEnv, db?: AppDB): PlanReviser => ({
  propose: async (input): Promise<PlanReviseResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return heuristicPlanReviser.propose(input);
    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 350,
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
      const intent = sanitizeIntent(parsed.data.intent);
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
