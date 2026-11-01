import type { AppDB } from "../db";
import { forbidden } from "./errors";
import { getEntitlementTier } from "../services/ai-budget";

/**
 * RBAC-lite: free vs pro (RevenueCat-synced entitlements). No admin roles.
 * Throws 403 when the user is not on an active/trial/grace Pro entitlement.
 */
export const requirePro = async (db: AppDB, userId: string): Promise<void> => {
  const tier = await getEntitlementTier(db, userId);
  if (tier !== "pro") {
    throw forbidden("Pro subscription required");
  }
};
