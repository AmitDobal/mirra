import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { canSpend } from "../services/ai-budget";
import type {
  PlanGenerateInput,
  PlanGenerateResult,
  PlanGenerator,
} from "../ports/plan-generator";
import { chatCompletion } from "./openai-client";
import { heuristicPlanGenerator } from "./heuristic-plan-generator";

const ExerciseSchema = z.object({
  name: z.string().min(1),
  cue: z.string().optional(),
  targetSets: z.number().int().positive(),
  targetReps: z.string().min(1),
  restSec: z.number().int().nonnegative().optional(),
  swapGroup: z.string().optional(),
});

const WorkoutSchema = z.object({
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
  focus: z.string().optional(),
  calorieEst: z.number().int().nonnegative().optional(),
  exercises: z.array(ExerciseSchema).min(1),
});

const DaySchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["lift", "rest", "fuel"]),
  label: z.string().optional(),
  workoutIndex: z.number().int().nonnegative().optional(),
});

const PlanResultSchema = z.object({
  summary: z.object({
    kcalTarget: z.number().int().positive(),
    proteinG: z.number().positive(),
    carbsG: z.number().positive(),
    fatG: z.number().positive(),
    outcomeLine: z.string().min(1),
  }),
  days: z.array(DaySchema).length(7),
  workouts: z.array(WorkoutSchema),
});

const SYSTEM = `You are Mirra, an AI co-coach building a highly personalized week. Return STRICT JSON only matching:
{"summary":{"kcalTarget":int,"proteinG":number,"carbsG":number,"fatG":number,"outcomeLine":string},
"days":[{"dayIndex":0-6,"date":"YYYY-MM-DD","kind":"lift"|"rest"|"fuel","label"?:string,"workoutIndex"?:int}],
"workouts":[{"title":string,"durationMin":int,"focus"?:string,"calorieEst"?:int,
"exercises":[{"name":string,"cue"?:string,"targetSets":int,"targetReps":string,"restSec"?:int,"swapGroup"?:string}]}]}
Rules:
- Exactly 7 days Mon-Sun (dayIndex 0=Mon). Lift days must set workoutIndex into workouts[]. Rest/fuel omit workoutIndex.
- Respect trainDays (1=Mon..7=Sun) and sessionMinutes.
- Use profile.sex, ageYears, heightCm, weightKg, goalWeightKg, pace for macros and volume (female athletes: slightly higher relative protein floor, avoid defaulting to male-only programming).
- Prefer exercises available given prefs.equipment.
- Shape the split and volume toward prefs.physiqueTarget when set (lean_cut, athletic, muscular, toned, strong).
- Honor prefs.lifestyleNotes when present (schedule constraints, likes/dislikes, recovery, travel, desk job, etc.) — adapt session density and exercise selection.
- Respect dietTags / foodsAvoid for outcomeLine tone only (meals are planned separately).
- Keep cues short and practical. outcomeLine must feel personal (1 sentence), never invent fake stats or social proof.`;

type MeterCtx = { db?: AppDB; userId?: string };

/** OpenAI PlanGenerator; Zod-invalid or API errors fall back to heuristic. */
export const createOpenAiPlanGenerator = (
  env: MirraEnv,
  meter?: MeterCtx,
): PlanGenerator => ({
  generate: async (input: PlanGenerateInput): Promise<PlanGenerateResult> => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return heuristicPlanGenerator.generate(input);

    if (!(await canSpend(meter?.db, meter?.userId ?? input.userId, "plan_gen"))) {
      console.warn("[openai-plan] AI budget reached → heuristic");
      return heuristicPlanGenerator.generate(input);
    }

    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({
              kind: input.kind,
              weekStart: input.weekStart,
              timezone: input.timezone,
              prefs: JSON.parse(input.prefsJson) as unknown,
              profile: JSON.parse(input.profileJson) as unknown,
            }),
          },
        ],
      });

      await logAiUsage({
        db: meter?.db,
        userId: meter?.userId ?? input.userId,
        action: "openai.plan.generate",
        feature: "plan_gen",
        model: completion.model,
        usage: completion.usage,
        meta: { kind: input.kind },
      });

      const parsed = PlanResultSchema.safeParse(JSON.parse(completion.content));
      if (!parsed.success) {
        console.warn(
          "[openai-plan] fallback to heuristic: response failed schema validation",
          parsed.error.issues.map((i) => i.message).join("; "),
        );
        const fb = await heuristicPlanGenerator.generate(input);
        return { ...fb, summary: { ...fb.summary, generator: "heuristic" } };
      }

      return {
        ...parsed.data,
        summary: { ...parsed.data.summary, generator: "openai" },
      };
    } catch (err) {
      console.warn(
        "[openai-plan] fallback to heuristic: error —",
        err instanceof Error ? err.message : String(err),
      );
      const fb = await heuristicPlanGenerator.generate(input);
      return { ...fb, summary: { ...fb.summary, generator: "heuristic" } };
    }
  },
});
