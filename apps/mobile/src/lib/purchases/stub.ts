import type {
  CustomerInfo,
  Offering,
  PackageIdentifier,
  PurchasesConfigureOptions,
  PurchasesPort,
  PurchasesResult,
  PurchaseResult,
} from "./types";

const emptyCustomer = (): CustomerInfo => ({
  activeEntitlements: [],
  isTrialing: true,
});

const ok = <T>(value: T): PurchasesResult<T> => ({ ok: true, value });

const DEMO_OFFERING: Offering = {
  identifier: "default",
  packages: [
    {
      identifier: "$rc_weekly",
      productIdentifier: "mirra_pro_weekly",
      offeringIdentifier: "default",
      title: "Mirra Pro",
      priceString: "—",
    },
  ],
};

/**
 * Demo / Expo Go adapter. Always trial-looking, never grants Pro entitlement.
 */
export const createStubPurchases = (): PurchasesPort => {
  let appUserId: string | undefined;

  return {
    async configure(options: PurchasesConfigureOptions) {
      appUserId = options.appUserId ?? undefined;
      return ok(undefined);
    },

    async logIn(id: string) {
      appUserId = id;
      return ok({ ...emptyCustomer(), originalAppUserId: id });
    },

    async logOut() {
      appUserId = undefined;
      return ok(emptyCustomer());
    },

    async getOfferings() {
      return ok([DEMO_OFFERING] as const);
    },

    async purchasePackage(_packageIdentifier: PackageIdentifier) {
      const customerInfo = {
        ...emptyCustomer(),
        originalAppUserId: appUserId,
      };
      return ok({ customerInfo } satisfies PurchaseResult);
    },

    async restore() {
      return ok({
        ...emptyCustomer(),
        originalAppUserId: appUserId,
      });
    },

    async hasEntitlement(_entitlementId: string) {
      return false;
    },

    async getCustomerInfo() {
      return ok({
        ...emptyCustomer(),
        originalAppUserId: appUserId,
      });
    },
  };
};
