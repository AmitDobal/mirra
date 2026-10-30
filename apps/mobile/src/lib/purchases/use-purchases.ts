import { useCallback, useState } from "react";

import { useEntitlementStore } from "@/stores/entitlement-store";

import { getPurchases } from "./instance";
import type { Offering, PackageIdentifier, PurchasesError } from "./types";
import { MIRRA_PRO_ENTITLEMENT } from "./types";

type PurchaseState = {
  readonly loading: boolean;
  readonly error: PurchasesError | null;
  readonly offerings: readonly Offering[];
};

const initial: PurchaseState = {
  loading: false,
  error: null,
  offerings: [],
};

/** Hook for paywall screens — syncs entitlement into Zustand after purchase/restore. */
export const usePurchases = () => {
  const [state, setState] = useState<PurchaseState>(initial);
  const setFromCustomer = useEntitlementStore((s) => s.setFromCustomer);
  const setStatus = useEntitlementStore((s) => s.setStatus);
  const isPro = useEntitlementStore((s) => s.isPro);
  const status = useEntitlementStore((s) => s.status);

  const refreshEntitlement = useCallback(async () => {
    const port = getPurchases();
    const entitled = await port.hasEntitlement(MIRRA_PRO_ENTITLEMENT);
    const info = await port.getCustomerInfo();
    if (info.ok) {
      setFromCustomer(info.value, MIRRA_PRO_ENTITLEMENT);
      return;
    }
    setStatus(entitled ? "active" : "trial");
  }, [setFromCustomer, setStatus]);

  const loadOfferings = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await getPurchases().getOfferings();
    if (!result.ok) {
      setState((s) => ({ ...s, loading: false, error: result.error }));
      return;
    }
    setState((s) => ({
      ...s,
      loading: false,
      offerings: result.value,
    }));
  }, []);

  const purchase = useCallback(
    async (packageIdentifier: PackageIdentifier) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const result = await getPurchases().purchasePackage(packageIdentifier);
      if (!result.ok) {
        setState((s) => ({ ...s, loading: false, error: result.error }));
        return result;
      }
      setFromCustomer(result.value.customerInfo, MIRRA_PRO_ENTITLEMENT);
      setState((s) => ({ ...s, loading: false }));
      return result;
    },
    [setFromCustomer],
  );

  const restore = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await getPurchases().restore();
    if (!result.ok) {
      setState((s) => ({ ...s, loading: false, error: result.error }));
      return result;
    }
    setFromCustomer(result.value, MIRRA_PRO_ENTITLEMENT);
    setState((s) => ({ ...s, loading: false }));
    return result;
  }, [setFromCustomer]);

  return {
    ...state,
    isPro,
    status,
    loadOfferings,
    purchase,
    restore,
    refreshEntitlement,
  };
};
