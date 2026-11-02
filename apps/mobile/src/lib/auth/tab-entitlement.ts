import { getAuthUserId } from "@/lib/auth/session";
import {
  isEntitledStatus,
  resolveEffectiveEntitlementStatus,
  type EntitlementLike,
} from "@/lib/auth/cold-start-route";
import {
  useEntitlementStore,
  type EntitlementStatus,
} from "@/stores/entitlement-store";
import { useMeStore } from "@/stores/me-store";

export { resolveEffectiveEntitlementStatus };

/** Persisted / in-memory /me entitlement for the signed-in user (if any). */
export const readMeEntitlementStatus = (): EntitlementLike => {
  const { cachedUser, cachedEntitlement, me } = useMeStore.getState();
  const userId = getAuthUserId();
  if (cachedUser && userId && cachedUser.id !== userId) return null;
  return me?.entitlement?.status ?? cachedEntitlement?.status ?? null;
};

/** Mirror entitled /me cache into Zustand so downstream hooks agree with the tab guard. */
export const syncEntitlementFromMeCache = (): EntitlementStatus => {
  const store = useEntitlementStore.getState();
  const effective = resolveEffectiveEntitlementStatus(
    store.status,
    readMeEntitlementStatus(),
  );
  if (effective !== store.status && isEntitledStatus(effective)) {
    store.setStatus(effective);
  }
  return useEntitlementStore.getState().status;
};
