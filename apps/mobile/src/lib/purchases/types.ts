export type PurchasesErrorCode =
  | "cancelled"
  | "network"
  | "product_unavailable"
  | "purchase_not_allowed"
  | "restore_failed"
  | "not_configured"
  | "unknown";

export type PurchasesError = {
  readonly code: PurchasesErrorCode;
  readonly message: string;
};

export type PackageIdentifier = string;

export type PurchasablePackage = {
  readonly identifier: PackageIdentifier;
  readonly productIdentifier: string;
  readonly offeringIdentifier?: string;
  readonly title?: string;
  readonly priceString?: string;
};

export type Offering = {
  readonly identifier: string;
  readonly packages: readonly PurchasablePackage[];
};

export type CustomerInfo = {
  readonly activeEntitlements: readonly string[];
  readonly originalAppUserId?: string;
  /** Stub / trial mirror — never grant Pro via stub alone. */
  readonly isTrialing?: boolean;
};

export type PurchaseResult = {
  readonly customerInfo: CustomerInfo;
};

export type PurchasesConfigureOptions = {
  readonly apiKey: string;
  readonly appUserId?: string | null;
  readonly entitlementId?: string;
};

export type PurchasesResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PurchasesError };

/** Port for paywall / restore — RevenueCat or stub. */
export interface PurchasesPort {
  configure(
    options: PurchasesConfigureOptions,
  ): Promise<PurchasesResult<void>>;
  logIn(appUserId: string): Promise<PurchasesResult<CustomerInfo>>;
  logOut(): Promise<PurchasesResult<CustomerInfo>>;
  getOfferings(): Promise<PurchasesResult<readonly Offering[]>>;
  purchasePackage(
    packageIdentifier: PackageIdentifier,
  ): Promise<PurchasesResult<PurchaseResult>>;
  restore(): Promise<PurchasesResult<CustomerInfo>>;
  /** Pro gate — stub always false. */
  hasEntitlement(entitlementId: string): Promise<boolean>;
  getCustomerInfo(): Promise<PurchasesResult<CustomerInfo>>;
}

export const MIRRA_PRO_ENTITLEMENT = "pro" as const;
