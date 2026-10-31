import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import type {
  CoachAdviseInput,
  CoachAdviseResult,
  CoachAdvisor,
} from "../ports/coach-advisor";
import { chatCompletion } from "./openai-client";
import { heuristicCoachAdvisor } from "./heuristic-coach-advisor";

const AdviseSchema = z.object({
  message: z.string().min(1).max(800),
  rebuildSuggested: z.boolean(),
  vectors: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        detail: z.string(),
        recommended: z.boolean(),
      }),
    )
    .optional(),
});

const SYSTEM = `You are Mirra, a concise AI co-coach for lifters. Reply STRICT JSON:
{"message":string,"rebuildSuggested":boolean,"vectors"?:[{"id":string,"title":string,"detail":string,"recommended":boolean}]}
Keep message under 2 sentences, warm and practical. Suggest rebuild when skipped/travel/low_sleep or readiness≤4. Max 3 vectors.`;

/** OpenAI CoachAdvisor; falls back to heuristic on failure. */
export const createOpenAiCoachAdvisor = (
  env: MirraEnv,
  db?: AppDB,
): CoachAdvisor => ({
  advise: async (input: CoachAdviseInput): Promise<CoachAdviseResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return heuristicCoachAdvisor.advise(input);

    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.6,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              status: input.status,
              readiness: input.readiness,
              note: input.note,
              vectorId: input.vectorId,
              context: input.context,
            }),
          },
        ],
      });

      await logAiUsage({
        db,
        userId: input.userId,
        action: "openai.coach.advise",
        model: completion.model,
        usage: completion.usage,
      });

      const parsed = AdviseSchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn("[openai-coach] zod failed; heuristic fallback");
        return heuristicCoachAdvisor.advise(input);
      }
      return { ...parsed.data, source: "openai" };
    } catch (err) {
      console.warn(
        "[openai-coach] error; heuristic fallback",
        err instanceof Error ? err.message : err,
      );
      return heuristicCoachAdvisor.advise(input);
    }
  },
});
