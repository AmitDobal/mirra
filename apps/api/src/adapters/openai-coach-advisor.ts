import { personaPromptBlock } from "@mirra/contracts";
import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import type {
  CoachAdviseInput,
  CoachAdviseResult,
  CoachAdvisor,
} from "../ports/coach-advisor";
import { goalDatesOk, goalRulesBlock, guardGoalCopy } from "../services/goal-copy";
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

/** AMI-181: appended when the user has a goal plan. */
const GOAL_SYSTEM = goalRulesBlock(
  [
    "GOAL DATA: input.goal is the user's goal, estimate and status. Tie the advice to it naturally: name the status in plain words and, only when relevant, the ETA as \"around <goal.etaExpected as month + day>\".",
    "The GOAL RULES beat PERSONA. Persona sets the voice only. Even in a harsh voice: no insults or name-calling, no threats, never claim the user did nothing, never guilt them about progress. When goal.status is on_track or ahead, say so and credit the habit.",
    "State only facts in input. input.status is today's check-in. Never name any date other than the ETA, not even tomorrow's: say \"tomorrow\".",
  ].join("\n"),
);

/** Coach speaks one date at most, the ETA: the milestone keeps its label, not its date. */
const coachGoal = (g: NonNullable<CoachAdviseInput["goal"]>) => ({
  ...g,
  nextMilestone: g.nextMilestone ? { label: g.nextMilestone.label, date: null } : null,
});

export const coachSystemPrompt = (input: CoachAdviseInput): string =>
  [SYSTEM, personaPromptBlock(input.persona), ...(input.goal ? [GOAL_SYSTEM] : [])].join("\n");

export const coachUserPayload = (input: CoachAdviseInput): string =>
  JSON.stringify({
    status: input.status,
    readiness: input.readiness,
    note: input.note,
    vectorId: input.vectorId,
    context: input.context,
    ...(input.goal ? { goal: coachGoal(input.goal) } : {}),
  });

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
          { role: "system", content: coachSystemPrompt(input) },
          { role: "user", content: coachUserPayload(input) },
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
      const copy = [parsed.data.message, ...(parsed.data.vectors ?? []).map((v) => `${v.title} ${v.detail}`)].join(" ");
      if (guardGoalCopy(copy, "", "openai-coach") === "") return heuristicCoachAdvisor.advise(input);
      if (input.goal && !goalDatesOk(copy, coachGoal(input.goal))) {
        console.warn("[openai-coach] date not from the goal estimate; heuristic fallback");
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
