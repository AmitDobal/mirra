import type {
  CustomerInfo,
  PackageIdentifier,
  PurchasesConfigureOptions,
  PurchasesError,
  PurchasesPort,
  PurchasesResult,
} from "./types";

const ok = <T>(value: T): PurchasesResult<T> => ({ ok: true, value });

const err = (error: PurchasesError): PurchasesResult<never> => ({
  ok: false,
  error,
});

const notConfigured = (message = "RevenueCat not configured"): PurchasesResult<never> =>
  err({ code: "not_configured", message });

type RcModule = {
  default: {
    configure: (opts: { apiKey: string; appUserID?: string }) => void;
    logIn: (id: string) => Promise<{ customerInfo: RcCustomerInfo }>;
    logOut: () => Promise<RcCustomerInfo>;
    getOfferings: () => Promise<{
      all: Record<
        string,
        {
          identifier: string;
          availablePackages: Array<{
            identifier: string;
            product: { identifier: string; title?: string; priceString?: string };
          }>;
        }
      >;
    }>;
    purchasePackage: (pkg: unknown) => Promise<{ customerInfo: RcCustomerInfo }>;
    restorePurchases: () => Promise<RcCustomerInfo>;
    getCustomerInfo: () => Promise<RcCustomerInfo>;
  };
};

type RcCustomerInfo = {
  entitlements: { active: Record<string, unknown> };
  originalAppUserId?: string;
};

const mapCustomer = (info: RcCustomerInfo): CustomerInfo => ({
  activeEntitlements: Object.keys(info.entitlements.active),
  originalAppUserId: info.originalAppUserId,
});

const loadRc = async (): Promise<RcModule["default"] | null> => {
  try {
    // Native module — absent in Expo Go / until linked. Prefer require so
    // Hermes bytecode export does not choke on dynamic `import()`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-purchases") as RcModule;
    return mod.default ?? (mod as unknown as RcModule["default"]);
  } catch {
    return null;
  }
};

/**
 * RevenueCat skeleton. Safe without API keys or the native package:
 * configure no-ops / returns not_configured; purchase paths fail closed.
 */
export const createRevenueCatPurchases = (): PurchasesPort => {
  let configured = false;
  let Purchases: RcModule["default"] | null = null;

  const ensure = async (): Promise<PurchasesResult<RcModule["default"]>> => {
    if (!configured || !Purchases) {
      return notConfigured(
        "Call configure with a non-empty RevenueCat API key first.",
      );
    }
    return ok(Purchases);
  };

  return {
    async configure(options: PurchasesConfigureOptions) {
      const key = options.apiKey?.trim();
      if (!key) {
        configured = false;
        Purchases = null;
        return notConfigured("Missing RevenueCat API key");
      }
      const rc = await loadRc();
      if (!rc) {
        configured = false;
        return notConfigured(
          "react-native-purchases unavailable (use a dev build + package).",
        );
      }
      try {
        rc.configure({
          apiKey: key,
          ...(options.appUserId ? { appUserID: options.appUserId } : {}),
        });
        Purchases = rc;
        configured = true;
        return ok(undefined);
      } catch (cause) {
        configured = false;
        Purchases = null;
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "unknown", message });
      }
    },

    async logIn(appUserId: string) {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        const { customerInfo } = await ready.value.logIn(appUserId);
        return ok(mapCustomer(customerInfo));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "unknown", message });
      }
    },

    async logOut() {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        return ok(mapCustomer(await ready.value.logOut()));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "unknown", message });
      }
    },

    async getOfferings() {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        const offerings = await ready.value.getOfferings();
        const mapped = Object.values(offerings.all).map((offering) => ({
          identifier: offering.identifier,
          packages: offering.availablePackages.map((pkg) => ({
            identifier: pkg.identifier,
            productIdentifier: pkg.product.identifier,
            offeringIdentifier: offering.identifier,
            title: pkg.product.title,
            priceString: pkg.product.priceString,
          })),
        }));
        return ok(mapped);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "network", message });
      }
    },

    async purchasePackage(packageIdentifier: PackageIdentifier) {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        const offerings = await ready.value.getOfferings();
        let match: unknown = null;
        for (const offering of Object.values(offerings.all)) {
          match = offering.availablePackages.find(
            (pkg) => pkg.identifier === packageIdentifier,
          );
          if (match) break;
        }
        if (!match) {
          return err({
            code: "product_unavailable",
            message: `No package "${packageIdentifier}"`,
          });
        }
        const { customerInfo } = await ready.value.purchasePackage(match);
        return ok({ customerInfo: mapCustomer(customerInfo) });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (/cancel/i.test(message)) {
          return err({ code: "cancelled", message });
        }
        return err({ code: "unknown", message });
      }
    },

    async restore() {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        return ok(mapCustomer(await ready.value.restorePurchases()));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "restore_failed", message });
      }
    },

    async hasEntitlement(entitlementId: string) {
      const ready = await ensure();
      if (!ready.ok) return false;
      try {
        const info = await ready.value.getCustomerInfo();
        return info.entitlements.active[entitlementId] !== undefined;
      } catch {
        return false;
      }
    },

    async getCustomerInfo() {
      const ready = await ensure();
      if (!ready.ok) return ready;
      try {
        return ok(mapCustomer(await ready.value.getCustomerInfo()));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        return err({ code: "unknown", message });
      }
    },
  };
};
