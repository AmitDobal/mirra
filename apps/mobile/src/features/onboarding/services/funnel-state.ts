import { getCurrentPlan } from "@/lib/api";
import type { MeResponse } from "@/lib/api/me";
import { getAuthUserId, hasSession } from "@/lib/auth";
import {
  isEntitledStatus,
  resolveColdStartRoute,
  type ColdStartDest,
  type EntitlementLike,
} from "@/lib/auth/cold-start-route";
import { errorMessage, logger } from "@/lib/logger";
import { getPurchases, MIRRA_PRO_ENTITLEMENT } from "@/lib/purchases";
import {
  useEntitlementStore,
  type EntitlementStatus,
} from "@/stores/entitlement-store";
import { useMeStore } from "@/stores/me-store";
import { usePlanStore } from "@/stores/plan-store";

import { useOnboardingStore } from "../store";
import { completeOnboardingFunnel } from "./complete-funnel";
import {
  isOnboardingCompleteLocal,
  isPlanGeneratedLocal,
} from "./memory-store";
import { persistWeekPlan } from "./plan-persist";
import { fromApiPlan } from "./week-reveal-map";

export type FunnelSnapshot = {
  readonly me: MeResponse | null;
  readonly serverOnboarded: boolean | null;
  readonly localCompleted: boolean;
  readonly planGenerated: boolean;
  readonly entitled: boolean;
  readonly entitlementStatus: EntitlementStatus | null;
};

/** GET /v1/me (fresh). `null` when offline / unauthenticated. */
export const fetchMeOrNull = async (): Promise<MeResponse | null> => {
  if (!hasSession()) return null;
  try {
    return await useMeStore.getState().ensureMe({ force: true });
  } catch (err) {
    logger.warn("funnel.me_failed", { message: errorMessage(err) });
    return null;
  }
};

/** Persisted /me entitlement for the same user (offline cold start). */
const cachedEntitlementStatus = (): EntitlementLike => {
  const { cachedUser, cachedEntitlement } = useMeStore.getState();
  if (!cachedUser || cachedUser.id !== getAuthUserId()) return null;
  return cachedEntitlement?.status ?? null;
};

const hasRevenueCatPro = async (): Promise<boolean> => {
  try {
    return await getPurchases().hasEntitlement(MIRRA_PRO_ENTITLEMENT);
  } catch {
    return false;
  }
};

/**
 * Entitled status = server trial/active/grace, OR an in-session purchase already in
 * the entitlement store, OR RevenueCat pro. `null` = not entitled (never assume trial).
 */
const computeEntitlement = async (
  me: MeResponse | null,
): Promise<EntitlementStatus | null> => {
  const server: EntitlementLike = me?.entitlement.status ?? cachedEntitlementStatus();
  if (server && isEntitledStatus(server)) return server;
  const local = useEntitlementStore.getState().status;
  if (isEntitledStatus(local)) return local;
  return (await hasRevenueCatPro()) ? "active" : null;
};

/** Mirror entitlement into Zustand so the tab guard agrees with the resolver. */
const mirrorEntitlement = (status: EntitlementStatus | null): void => {
  if (!status) return;
  const store = useEntitlementStore.getState();
  if (store.status !== status) store.setStatus(status);
};

export const loadFunnelSnapshot = async (): Promise<FunnelSnapshot> => {
  const me = await fetchMeOrNull();
  const storeDone = useOnboardingStore.getState().completed;
  const localCompleted = storeDone || (await isOnboardingCompleteLocal());
  const planGenerated =
    localCompleted ||
    Boolean(useOnboardingStore.getState().weekPlan) ||
    (await isPlanGeneratedLocal());
  const entitlementStatus = await computeEntitlement(me);
  return {
    me,
    serverOnboarded: me ? me.onboardingCompleted : null,
    localCompleted,
    planGenerated,
    entitled: entitlementStatus !== null,
    entitlementStatus,
  };
};

/** Pull the server week plan into SQLite + plan store (returning users). */
export const mirrorServerPlan = async (): Promise<void> => {
  try {
    const raw = await getCurrentPlan();
    if (!raw?.days?.length) return;
    usePlanStore.getState().setPlan(raw);
    await persistWeekPlan(fromApiPlan(raw), "api");
  } catch (err) {
    logger.warn("funnel.plan_mirror_failed", { message: errorMessage(err) });
  }
};

type RouteOpts = { readonly revealSeen?: boolean; readonly afterSignIn?: boolean };

/**
 * Resolve destination from server + local truth and apply side-effects:
 * entitlement mirror, funnel-complete only when really onboarded + entitled.
 */
export const resolveFunnelDestination = async (
  snapshot: FunnelSnapshot,
  opts: RouteOpts = {},
): Promise<ColdStartDest> => {
  mirrorEntitlement(snapshot.entitlementStatus);
  const dest = resolveColdStartRoute({
    hasSession: hasSession(),
    serverOnboarded: snapshot.serverOnboarded,
    localCompleted: snapshot.localCompleted,
    planGenerated: snapshot.planGenerated,
    entitled: snapshot.entitled,
    revealSeen: opts.revealSeen,
    afterSignIn: opts.afterSignIn,
  });
  if (dest === "/(tabs)/today") await completeOnboardingFunnel();
  logger.info("funnel.route", {
    dest,
    serverOnboarded: snapshot.serverOnboarded,
    entitled: snapshot.entitled,
  });
  return dest;
};
