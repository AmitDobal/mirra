import { z } from "zod";

export const AiCreditsModeSchema = z.enum(["off", "shadow", "enforce"]);
export type AiCreditsMode = z.infer<typeof AiCreditsModeSchema>;

export const CreditsResponseSchema = z.object({
  tier: z.enum(["free", "pro"]),
  mode: AiCreditsModeSchema,
  /** UTC month, `YYYY-MM`. */
  period: z.string(),
  granted: z.number().int(),
  bonus: z.number().int(),
  spent: z.number().int(),
  /** Credits held by in-flight AI calls. */
  reserved: z.number().int(),
  remaining: z.number().int().min(0),
  absoluteCap: z.number().int(),
  resetsAt: z.string(),
  /** Credits per paid AI action, keyed by feature. Heuristic replies cost 0. */
  costs: z.record(z.string(), z.number().int()),
  usd: z.object({ usedMicros: z.number().int(), capMicros: z.number().int() }),
  /** Monthly per-feature action caps in force for this tier. */
  actionCaps: z.record(z.string(), z.object({ used: z.number().int(), limit: z.number().int() })),
  warnings: z.array(z.enum(["low_credits", "out_of_credits", "spend_cap_near"])),
  referralTopUpEnabled: z.boolean(),
});
export type CreditsResponse = z.infer<typeof CreditsResponseSchema>;

export const ReferralInfoSchema = z.object({
  code: z.string(),
  shareUrl: z.string(),
  redeemedCount: z.number().int(),
  bonusThisMonth: z.number().int(),
  bonusCap: z.number().int(),
  topUpEnabled: z.boolean(),
});
export type ReferralInfo = z.infer<typeof ReferralInfoSchema>;

export const ReferralRedeemBodySchema = z.object({
  code: z.string().trim().min(4).max(16),
});
export type ReferralRedeemBody = z.infer<typeof ReferralRedeemBodySchema>;

export const ReferralRedeemResponseSchema = z.object({
  status: z.enum(["pending", "awarded"]),
  creditsAwarded: z.number().int(),
});
export type ReferralRedeemResponse = z.infer<typeof ReferralRedeemResponseSchema>;

/** Body of 402/429 AI limit errors (`error.code` = ai_credits_exhausted | ai_spend_cap | ai_action_cap). */
export const AiLimitErrorSchema = z.object({
  code: z.enum(["ai_credits_exhausted", "ai_spend_cap", "ai_action_cap"]),
  message: z.string(),
  resetsAt: z.string(),
  heuristicAvailable: z.boolean(),
});
export type AiLimitError = z.infer<typeof AiLimitErrorSchema>;
