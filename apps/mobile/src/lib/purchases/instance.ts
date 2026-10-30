import { env } from "@/lib/config/env";

import { createRevenueCatPurchases } from "./revenuecat";
import { createStubPurchases } from "./stub";
import type { PurchasesPort } from "./types";
import { MIRRA_PRO_ENTITLEMENT } from "./types";

let singleton: PurchasesPort | null = null;

/** Stub unless `env.revenueCatEnabled` (non-empty RC key + flag). */
export const createPurchases = (): PurchasesPort => {
  if (env.revenueCatEnabled) {
    return createRevenueCatPurchases();
  }
  return createStubPurchases();
};

export const getPurchases = (): PurchasesPort => {
  if (!singleton) {
    singleton = createPurchases();
  }
  return singleton;
};

/** Call once at app boot (RootLayout). Safe no-op without keys. */
export const configurePurchases = async (
  appUserId?: string | null,
): Promise<void> => {
  const port = getPurchases();
  await port.configure({
    apiKey: env.revenueCatApiKey,
    appUserId: appUserId ?? env.mirraUserId,
    entitlementId: MIRRA_PRO_ENTITLEMENT,
  });
};
