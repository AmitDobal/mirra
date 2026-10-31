import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { resolveCreditsMode } from "../lib/ai-credits";
import type { AiFeature } from "../lib/ai-quotas";
import { ApiError } from "../lib/errors";
import { getEntitlementTier } from "./ai-budget";
import { releaseReservation, reserveCredits, settleReservation, type Reservation } from "./credits-reservations";

export type CreditsCtx = { env: MirraEnv; db: AppDB; userId: string };

/**
 * THE credits gate. Wrap a paid AI call:
 *  - `paid` false (no provider key, forced heuristic) or mode `off` → just run, nothing reserved.
 *  - reserve → run → settle when `wasPaid(result)`, else release (heuristic fallback costs 0).
 *  - thrown errors release the hold and rethrow.
 * In `enforce`, an empty balance or hard cap throws 402/429 before the provider is called.
 * In `shadow`, ledger rows are written but nothing is ever blocked.
 */
export const withAiCredits = async <T>(
  ctx: CreditsCtx,
  opts: { feature: AiFeature; paid: boolean; wasPaid: (result: T) => boolean },
  run: () => Promise<T>,
): Promise<T> => {
  const mode = resolveCreditsMode(ctx.env);
  if (mode === "off" || !opts.paid) return run();

  let hold: Reservation;
  try {
    const tier = await getEntitlementTier(ctx.db, ctx.userId);
    hold = await reserveCredits(ctx.db, ctx.env, { userId: ctx.userId, feature: opts.feature, tier, mode });
  } catch (err) {
    if (err instanceof ApiError || mode === "enforce") throw err;
    console.warn("[ai-credits] shadow reserve failed; continuing", err instanceof Error ? err.message : err);
    return run();
  }

  let result: T;
  try {
    result = await run();
  } catch (err) {
    await releaseReservation(ctx.db, hold.id).catch((e) => console.warn("[ai-credits] release failed", e));
    throw err;
  }
  // The user already got their answer: a ledger hiccup must not turn it into a 500.
  try {
    if (opts.wasPaid(result)) await settleReservation(ctx.db, hold.id);
    else await releaseReservation(ctx.db, hold.id);
  } catch (err) {
    console.warn("[ai-credits] settle/release failed; hold expires on its own", err);
  }
  return result;
};
