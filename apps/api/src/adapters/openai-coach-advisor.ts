import { personaPromptBlock } from "@mirra/contracts";
import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { canSpend } from "../services/ai-budget";
import type {
  CoachAdviseInput,
  CoachAdviseResult,
  CoachAdvisor,
} from "../ports/coach-advisor";
import { scenarioLine } from "../services/accountability-copy";
import { citesScenarioFacts } from "../services/coach-guard";
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

const SYSTEM = `You are Mirra, an accountable personal trainer. Specific, zero fluff, always honest about the numbers. Your voice is set by PERSONA (default: hard-nosed drill sergeant). Never cruel about body or worth.
Reply STRICT JSON: {"message":string,"rebuildSuggested":boolean,"vectors"?:[{"id":string,"title":string,"detail":string,"recommended":boolean}]}
Input has PERSONA (voice and tone: follow it for wording only, never change facts or numbers), SCENARIO (primary), SECONDARY, FACTS (exact numbers), CALLOUT (the vetted call-out for today) and HISTORY (7-day summary).
Rules:
- PERSONA voice must be clearly audible in word choice, rhythm and the closing line (drill barks orders, honey is tender, wit is deadpan, spark jokes, zen is calm and brief, rival talks scoreboard). Facts and numbers stay exact.
- Build the message from CALLOUT: keep its numbers and its concrete next action (food, protein, walk, session). You may reword for voice, not substance.
- Never say the user has not logged meals or workouts unless FACTS shows it. Never mention a streak unless streakDays > 0.
- Name the failure for the SCENARIO and MUST cite the exact logged and target numbers from FACTS (e.g. "2500 against 2000 kcal, over by 500"). Never soften an over-target or missed-lift day into praise.
- NEVER invent macros, calories, weights, dates or sessions. Only use numbers present in FACTS/HISTORY. If a number is missing, do not state one.
- Give one concrete next action with a number and a time, then one short line of belief using HISTORY.
- OVER_KCAL: cite logged, target and the overage. UNDER_PROTEIN: cite grams short. MISSED_LIFT: cite the workout and missed count. UNDER_EATING: cite kcal vs target. STREAK_BREAK: cite the streak. LOW_READINESS: supportive but firm, cut volume, hold protein. ON_TRACK: praise in one line and raise the bar; no corrective kcal advice, never tell them to eat more or less.
- Never use em dashes or semicolons. Prefer short sentences.
- Max 3 sentences, under 60 words. Suggest rebuild when skipped/travel/low_sleep, LOW_READINESS, or readiness<=4. Max 3 vectors.`;

const buildUserPayload = (input: CoachAdviseInput): string => {
  const acc = input.accountability;
  if (!acc) {
    return JSON.stringify({
      PERSONA: personaPromptBlock(input.persona),
      status: input.status,
      readiness: input.readiness,
      note: input.note,
      vectorId: input.vectorId,
      context: input.context,
    });
  }
  const f = acc.facts;
  return JSON.stringify({
    PERSONA: personaPromptBlock(input.persona),
    SCENARIO: acc.scenario,
    SECONDARY: acc.secondary,
    FACTS: {
      kcalLogged: f.kcalLogged,
      kcalTarget: f.kcalTarget,
      kcalDelta: f.kcalLogged - f.kcalTarget,
      proteinGLogged: Math.round(f.proteinGLogged),
      proteinGTarget: Math.round(f.proteinGTarget),
      workout: f.workoutTitle,
      workoutDone: f.workoutDone,
      missedSessions7d: f.missedSessions7d,
      checkInStatus: f.checkInStatus,
      streakDays: f.streakDays,
      hourUtc: f.hourLocal,
    },
    CALLOUT: scenarioLine(acc.scenario, f),
    HISTORY: [acc.tenureLine, acc.historySummary].filter(Boolean).join(" | "),
    status: input.status,
    readiness: input.readiness,
    note: input.note?.slice(0, 200),
    vectorId: input.vectorId,
  });
};

/** OpenAI CoachAdvisor; falls back to heuristic on failure. */
export const createOpenAiCoachAdvisor = (
  env: MirraEnv,
  db?: AppDB,
): CoachAdvisor => ({
  advise: async (input: CoachAdviseInput): Promise<CoachAdviseResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[openai-coach] fallback to heuristic: OPENAI_API_KEY missing");
      return heuristicCoachAdvisor.advise(input);
    }

    if (!(await canSpend(db, input.userId, "coach"))) {
      console.warn("[openai-coach] AI budget reached → heuristic");
      return heuristicCoachAdvisor.advise(input);
    }

    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.5,
        maxTokens: 220,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: buildUserPayload(input),
          },
        ],
      });

      await logAiUsage({
        db,
        userId: input.userId,
        action: "openai.coach.advise",
        feature: "coach",
        model: completion.model,
        usage: completion.usage,
      });

      const parsed = AdviseSchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn(
          "[openai-coach] fallback to heuristic: response failed schema validation",
          parsed.error.issues.map((i) => i.message).join("; "),
        );
        return heuristicCoachAdvisor.advise(input);
      }
      const acc = input.accountability;
      if (acc && !citesScenarioFacts(acc.scenario, acc.facts, parsed.data.message)) {
        console.warn("[openai-coach] fallback to heuristic: message missed scenario numbers");
        return heuristicCoachAdvisor.advise(input);
      }
      return { ...parsed.data, source: "openai", scenario: acc?.scenario };
    } catch (err) {
      console.warn(
        "[openai-coach] fallback to heuristic: error —",
        err instanceof Error ? err.message : String(err),
      );
      return heuristicCoachAdvisor.advise(input);
    }
  },
});
