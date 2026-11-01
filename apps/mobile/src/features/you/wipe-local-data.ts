import { getLocalUserId, LOCAL_USER_ID, wipeUserRows } from "@/db";
import { clearVoiceCuePrefs } from "@/features/coach/voice-cue-prefs";
import { useCoachStore, usePlanChatStore } from "@/features/coach";
import { useChefStore } from "@/features/fuel/chef-store";
import { useFuelStore } from "@/features/fuel";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useHistoryStore } from "@/features/history";
import { useOnboardingStore } from "@/features/onboarding";
import { useProgressStore, useWeightStore } from "@/features/progress";
import { useAttendanceStore } from "@/features/today/attendance-store";
import { useTodayStore } from "@/features/today";
import { usePersonaStore } from "@/features/trainer";
import { useWorkoutStore } from "@/features/workout";
import { authClient } from "@/lib/auth/auth-client";
import { clearSession, getAuthUserId } from "@/lib/auth";
import { errorMessage, logger } from "@/lib/logger";
import { useCreditsStore } from "@/stores/credits-store";
import { useEntitlementStore } from "@/stores/entitlement-store";
import { useMeStore } from "@/stores/me-store";
import { usePlanStore } from "@/stores/plan-store";

type Resettable = {
  readonly setState: (state: never, replace: true) => void;
  readonly getInitialState: () => unknown;
};

/** Zustand stores holding user data: restore each to its initial state. */
const DATA_STORES: readonly Resettable[] = [
  useOnboardingStore,
  usePlanStore,
  useEntitlementStore,
  useTodayStore,
  useFuelStore,
  useMealPlanStore,
  useChefStore,
  useHistoryStore,
  useProgressStore,
  useWeightStore,
  useCoachStore,
  usePlanChatStore,
  useWorkoutStore,
  usePersonaStore,
  useAttendanceStore,
] as unknown as readonly Resettable[];

const resetStores = (): void => {
  for (const store of DATA_STORES) {
    store.setState(store.getInitialState() as never, true);
  }
};

/**
 * Erase everything Mirra stored on this device for the current user:
 * SQLite rows, in-memory stores, cached /me + credits, SecureStore session.
 * SQLite is wiped BEFORE `clearSession` (which would re-home rows to the fallback id).
 */
export const wipeLocalUserData = async (): Promise<void> => {
  const ids = new Set([getAuthUserId(), getLocalUserId(), LOCAL_USER_ID]);
  for (const id of ids) {
    try {
      await wipeUserRows(id);
    } catch (err) {
      logger.error("account.wipe.sqlite_failed", { message: errorMessage(err) });
      throw err;
    }
  }
  try {
    await authClient.signOut();
  } catch {
    /* session already deleted server-side */
  }
  await Promise.all([
    useMeStore.getState().clear(),
    useCreditsStore.getState().clear(),
    clearVoiceCuePrefs(),
  ]);
  resetStores();
  await clearSession();
};
