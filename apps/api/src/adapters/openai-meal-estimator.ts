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
import {
  MEAL_JSON_SCHEMA,
  MealModelOutputSchema,
  toMealEstimateResult,
} from "./meal-estimate-schema";
import { chatCompletion, type ChatMessage } from "./openai-client";

const SYSTEM = `You are Mirra Fuel. Estimate a single meal from a photo and/or description.
Break the meal into ingredients with grams. Totals must equal the sum of the ingredients.
Give fiberG, sugarG and sodiumMg when you can judge them, otherwise null.
warnings are short wellness notes (for example "High in sodium"). Never diagnose or give medical advice.
Be realistic. Prefer underestimating oils you cannot see. Set confidence below 0.5 if uncertain.
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
      "Estimate calories, macros, micros and ingredients for this meal.",
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
        jsonSchema: { name: "meal_estimate", schema: MEAL_JSON_SCHEMA },
        temperature: 0,
        baseUrl: env.OPENAI_BASE_URL,
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

      const parsed = MealModelOutputSchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn("[openai-meal] schema fail → heuristic");
        return heuristicMealEstimator.estimate(input);
      }
      return toMealEstimateResult(parsed.data);
    } catch (err) {
      console.warn(
        "[openai-meal] error → heuristic",
        err instanceof Error ? err.message : String(err),
      );
      return heuristicMealEstimator.estimate(input);
    }
  },
});
