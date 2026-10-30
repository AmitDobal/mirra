/** Soft typings — package optional until a native/dev build links it. */
declare module "react-native-purchases" {
  const Purchases: {
    configure: (opts: { apiKey: string; appUserID?: string }) => void;
    logIn: (id: string) => Promise<{
      customerInfo: {
        entitlements: { active: Record<string, unknown> };
        originalAppUserId?: string;
      };
    }>;
    logOut: () => Promise<{
      entitlements: { active: Record<string, unknown> };
      originalAppUserId?: string;
    }>;
    getOfferings: () => Promise<{
      all: Record<
        string,
        {
          identifier: string;
          availablePackages: Array<{
            identifier: string;
            product: {
              identifier: string;
              title?: string;
              priceString?: string;
            };
          }>;
        }
      >;
    }>;
    purchasePackage: (pkg: unknown) => Promise<{
      customerInfo: {
        entitlements: { active: Record<string, unknown> };
        originalAppUserId?: string;
      };
    }>;
    restorePurchases: () => Promise<{
      entitlements: { active: Record<string, unknown> };
      originalAppUserId?: string;
    }>;
    getCustomerInfo: () => Promise<{
      entitlements: { active: Record<string, unknown> };
      originalAppUserId?: string;
    }>;
  };
  export default Purchases;
}
