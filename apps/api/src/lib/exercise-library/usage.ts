import type { AppDB } from "../../db";
import { aiUsageEvents } from "../../db/schema";
import { estimateMicros } from "../ai-pricing";
import { newId } from "../id";

type SystemUsage = {
  action: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  meta?: Record<string, unknown>;
};

/** Feature bucket for exercise tagging. System cost: no user id, never touches credits or quotas. */
export const EXERCISE_TAG_FEATURE = "exercise_tag";

/** Write one `ai_usage_events` row with `user_id` null. Never throws. */
export const logSystemAiUsage = async (db: AppDB | undefined, u: SystemUsage): Promise<void> => {
  const micros = estimateMicros("openai", u.model, u.usage ?? {});
  console.log(
    "[ai-usage]",
    JSON.stringify({ action: u.action, feature: EXERCISE_TAG_FEATURE, model: u.model, estimatedMicros: micros }),
  );
  if (!db) return;
  try {
    await db.insert(aiUsageEvents).values({
      id: newId(),
      userId: null,
      feature: EXERCISE_TAG_FEATURE,
      provider: "openai",
      model: u.model,
      promptTokens: u.usage?.promptTokens ?? null,
      completionTokens: u.usage?.completionTokens ?? null,
      totalTokens: u.usage?.totalTokens ?? null,
      estimatedMicros: micros,
      metaJson: JSON.stringify({ action: u.action, system: true, ...u.meta }),
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("[exercise-tag] usage log failed", err instanceof Error ? err.message : String(err));
  }
};
