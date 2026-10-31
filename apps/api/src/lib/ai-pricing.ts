/**
 * Rough USD pricing for metering (not billing). Output unit = USD micros (1e-6 USD).
 * Update when vendors change prices; estimates only drive dashboards + sanity caps.
 */
export type PricingUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** TTS billed per character. */
  characters?: number;
};

/** micros per token (= USD per 1M tokens). */
const TOKEN_RATES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
};
const DEFAULT_TOKEN_RATE = TOKEN_RATES["gpt-4o-mini"]!;

/** micros per character. eleven_multilingual_v2 ≈ $0.18 / 1k chars; flash/turbo are half. */
const CHAR_RATES: Record<string, number> = {
  eleven_multilingual_v2: 180,
  eleven_turbo_v2_5: 90,
  eleven_flash_v2_5: 90,
};
const DEFAULT_CHAR_RATE = 180;

const baseModel = (model: string): string =>
  Object.keys(TOKEN_RATES).find((k) => model === k || model.startsWith(`${k}-`)) ?? model;

export const estimateMicros = (
  provider: string,
  model: string | null | undefined,
  usage: PricingUsage,
): number => {
  const id = model ?? "";
  if (provider === "elevenlabs") {
    return Math.round((usage.characters ?? 0) * (CHAR_RATES[id] ?? DEFAULT_CHAR_RATE));
  }
  if (provider === "openai") {
    const rate = TOKEN_RATES[baseModel(id)] ?? DEFAULT_TOKEN_RATE;
    const prompt = usage.promptTokens ?? usage.totalTokens ?? 0;
    const completion = usage.completionTokens ?? 0;
    return Math.round(prompt * rate.in + completion * rate.out);
  }
  return 0;
};
