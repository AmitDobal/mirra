import { submitCheckIn } from "@/db";
import { useFuelStore } from "@/features/fuel/fuel-store";
import { useCoachStore } from "@/features/coach/coach-store";
import { useTodayStore } from "@/features/today/today-store";
import { createCheckIn, type CheckInStatus } from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const SYNC_FAILED_NOTICE =
  "Check-in failed to sync — not saved. Check your connection and try again.";

/**
 * Save locally, then to the API (source of truth for Today).
 * Resolves `true` only when the server accepted it; never claims "saved" otherwise.
 */
export const persistCheckIn = async (
  status: CheckInStatus,
  note: string,
): Promise<boolean> => {
  const localDate = todayIso();
  let checkInId: string | null = null;

  try {
    const row = await submitCheckIn({ localDate, status, note, triggeredRebuild: false });
    checkInId = row.id;
  } catch (err) {
    logger.warn("checkin.local.failed", { message: errorMessage(err) });
  }

  try {
    const remote = await createCheckIn({ localDate, status, note });
    checkInId = remote.id;
    logger.info("checkin.remote.ok", { id: remote.id, status });
  } catch (err) {
    logger.error("checkin.remote.failed", {
      message: errorMessage(err),
      status: err instanceof MirraApiError ? err.status : undefined,
      code: err instanceof MirraApiError ? err.code : undefined,
    });
    return false;
  }

  useCoachStore.setState({ lastCheckInId: checkInId, checkedInDate: localDate });
  // Optimistic: hide the Today "Check-in" chip before the hydrate round-trip.
  useTodayStore.setState({ checkInDue: false });
  void useCoachStore.getState().hydrate();
  void useFuelStore.getState().hydrate();
  // Today may not be loaded yet (deep link): wait so the result diffs against the real workout.
  const refresh = useTodayStore.getState().hydrate().catch(() => undefined);
  if (!useTodayStore.getState().workout) await refresh;
  return true;
};
