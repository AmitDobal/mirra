import type { EntitlementStatus } from "@/stores/entitlement-store";

/** When RevenueCat customer info is unavailable, never invent `trial`. */
export const fallbackEntitlementStatus = (
  entitled: boolean,
): EntitlementStatus => (entitled ? "active" : "none");
