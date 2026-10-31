import type { AppDB } from "../db";
import { auditLog } from "../db/schema";
import { recordUsage } from "../services/ai-budget";
import { estimateMicros } from "./ai-pricing";
import type { AiFeature } from "./ai-quotas";
import { newId } from "./id";

type AiUsageOpts = {
  db?: AppDB;
  userId?: string;
  action: string;
  /** Quota bucket. When set with db+userId the call is metered in ai_usage_*. */
  feature?: AiFeature;
  provider?: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  meta?: Record<string, unknown>;
};

/**
 * Meter AI calls: console always; `ai_usage_events` + daily rollup when db, userId and
 * feature are present (else legacy audit_log). Never include secrets.
 */
export const logAiUsage = async (opts: AiUsageOpts): Promise<void> => {
  const provider = opts.provider ?? "openai";
  const estimatedMicros = estimateMicros(provider, opts.model, opts.usage ?? {});
  const row = {
    action: opts.action,
    feature: opts.feature,
    model: opts.model,
    promptTokens: opts.usage?.promptTokens ?? null,
    completionTokens: opts.usage?.completionTokens ?? null,
    totalTokens: opts.usage?.totalTokens ?? null,
    estimatedMicros,
    ...opts.meta,
  };
  console.log("[ai-usage]", JSON.stringify(row));

  if (!opts.db) return;
  try {
    if (opts.userId && opts.feature) {
      await recordUsage(opts.db, {
        userId: opts.userId,
        feature: opts.feature,
        provider,
        model: opts.model,
        promptTokens: opts.usage?.promptTokens,
        completionTokens: opts.usage?.completionTokens,
        totalTokens: opts.usage?.totalTokens,
        estimatedMicros,
        meta: { action: opts.action, ...opts.meta },
      });
      return;
    }
    await opts.db.insert(auditLog).values({
      id: newId(),
      userId: opts.userId ?? null,
      action: opts.action,
      metaJson: JSON.stringify(row),
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("[ai-usage] persist failed", err);
  }
};
