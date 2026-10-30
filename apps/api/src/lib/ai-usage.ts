import type { AppDB } from "../db";
import { auditLog } from "../db/schema";
import { newId } from "./id";

type AiUsageOpts = {
  db?: AppDB;
  userId?: string;
  action: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  meta?: Record<string, unknown>;
};

/** Meter AI calls — console + optional D1 audit_log. Never include secrets. */
export const logAiUsage = async (opts: AiUsageOpts): Promise<void> => {
  const row = {
    action: opts.action,
    model: opts.model,
    promptTokens: opts.usage?.promptTokens ?? null,
    completionTokens: opts.usage?.completionTokens ?? null,
    totalTokens: opts.usage?.totalTokens ?? null,
    ...opts.meta,
  };
  console.log("[ai-usage]", JSON.stringify(row));

  if (!opts.db) return;
  try {
    await opts.db.insert(auditLog).values({
      id: newId(),
      userId: opts.userId ?? null,
      action: opts.action,
      metaJson: JSON.stringify(row),
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("[ai-usage] audit_log insert failed", err);
  }
};
