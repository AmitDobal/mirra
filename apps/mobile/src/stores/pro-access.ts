import { hasProAccess } from "@/lib/purchases/pro-access";

import { useEntitlementStore } from "./entitlement-store";
import { useMeStore } from "./me-store";

/** Pro right now (server /v1/me, cached /v1/me, or an in-session purchase). Same gate as API `requirePro`. */
export const isProNow = (): boolean => {
  const me = useMeStore.getState();
  return hasProAccess({
    me: me.me?.entitlement?.status,
    cachedMe: me.cachedEntitlement?.status,
    store: useEntitlementStore.getState().status,
  });
};

export const useIsPro = (): boolean => {
  const me = useMeStore((s) => s.me?.entitlement?.status);
  const cachedMe = useMeStore((s) => s.cachedEntitlement?.status);
  const store = useEntitlementStore((s) => s.status);
  return hasProAccess({ me, cachedMe, store });
};
