import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { canSpend } from "../services/ai-budget";
import type {
  MealEstimateInput,
  MealEstimateResult,
  MealEstimator,
} from "../ports/meal-estimator";
import { heuristicMealEstimator } from "./heuristic-meal-estimator";
import { chatCompletion, type ChatMessage } from "./openai-client";

const EstimateSchema = z.object({
  name: z.string().min(1).max(120),
  kcal: z.number().int().min(0).max(5000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(600),
  fatG: z.number().min(0).max(300),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(400).optional(),
});

const SYSTEM = `You are Mirra Fuel — estimate a single meal from a photo and/or description.
Reply STRICT JSON:
{"name":string,"kcal":number,"proteinG":number,"carbsG":number,"fatG":number,"confidence":0-1,"notes"?:string}
Be realistic. Prefer underestimating oils you cannot see. confidence <0.5 if uncertain.
Never use em dashes or semicolons. Prefer short sentences.`;

/** OpenAI vision meal estimator (Cal AI–style). Falls back to heuristic. */
export const createOpenAiMealEstimator = (
  env: MirraEnv,
  db?: AppDB,
): MealEstimator => ({
  estimate: async (input: MealEstimateInput): Promise<MealEstimateResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return heuristicMealEstimator.estimate(input);
    if (!input.imageDataUrl && !input.description?.trim()) {
      return heuristicMealEstimator.estimate(input);
    }

    if (!(await canSpend(db, input.userId, "meal_estimate"))) {
      console.warn("[openai-meal] AI budget reached → heuristic");
      return heuristicMealEstimator.estimate(input);
    }

    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const userContent: ChatMessage["content"] = [];
    const prompt = [
      "Estimate calories and macros for this meal.",
      input.description?.trim()
        ? `User description: ${input.description.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    userContent.push({ type: "text", text: prompt });
    if (input.imageDataUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: input.imageDataUrl },
      });
    }

    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      });

      await logAiUsage({
        db,
        userId: input.userId,
        action: "openai.meal.estimate",
        feature: "meal_estimate",
        model: completion.model,
        usage: completion.usage,
      });

      const parsed = EstimateSchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn("[openai-meal] schema fail → heuristic");
        return heuristicMealEstimator.estimate(input);
      }
      return { ...parsed.data, source: "openai" };
    } catch (err) {
      console.warn(
        "[openai-meal] error → heuristic",
        err instanceof Error ? err.message : String(err),
      );
      return heuristicMealEstimator.estimate(input);
    }
  },
});
