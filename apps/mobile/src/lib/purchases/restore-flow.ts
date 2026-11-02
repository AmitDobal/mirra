import type { CustomerInfo, PurchasesPort, PurchasesResult } from "./types";

export type RestoreOutcome =
  | { readonly kind: "pro"; readonly info: CustomerInfo }
  | { readonly kind: "none"; readonly info: CustomerInfo }
  | { readonly kind: "error"; readonly message: string };

/** Pro only when the entitlement is actually active — an empty/stub `ok` never counts. */
export const hasProEntitlement = (
  info: CustomerInfo,
  entitlementId: string,
): boolean => info.activeEntitlements.includes(entitlementId);

/** RevenueCat logIn (when a session exists) so restore attaches to the right user. */
export const restoreWithLogin = async (
  port: PurchasesPort,
  appUserId: string | null,
): Promise<PurchasesResult<CustomerInfo>> => {
  if (appUserId) {
    const login = await port.logIn(appUserId);
    if (!login.ok) return login;
  }
  return port.restore();
};

export const classifyRestore = (
  result: PurchasesResult<CustomerInfo>,
  entitlementId: string,
): RestoreOutcome => {
  if (!result.ok) return { kind: "error", message: result.error.message };
  return hasProEntitlement(result.value, entitlementId)
    ? { kind: "pro", info: result.value }
    : { kind: "none", info: result.value };
};
