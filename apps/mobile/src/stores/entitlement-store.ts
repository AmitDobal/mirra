import { create } from "zustand";

import type { CustomerInfo } from "@/lib/purchases/types";

export type EntitlementStatus =
  | "trial"
  | "active"
  | "expired"
  | "grace"
  | "none";

type EntitlementState = {
  readonly status: EntitlementStatus;
  readonly isPro: boolean;
  readonly productId: string | null;
  readonly expiresAt: number | null;
  readonly activeEntitlements: readonly string[];
  readonly setStatus: (status: EntitlementStatus) => void;
  readonly setFromCustomer: (
    info: CustomerInfo,
    proEntitlementId: string,
  ) => void;
  readonly reset: () => void;
};

/** Unknown until /v1/me, RevenueCat, or a purchase says otherwise — never assume trial. */
const initial = {
  status: "none" as const,
  isPro: false,
  productId: null,
  expiresAt: null,
  activeEntitlements: [] as readonly string[],
};

export const useEntitlementStore = create<EntitlementState>((set) => ({
  ...initial,

  setStatus: (status) =>
    set({
      status,
      isPro: status === "active" || status === "grace",
    }),

  setFromCustomer: (info, proEntitlementId) => {
    const isPro = info.activeEntitlements.includes(proEntitlementId);
    set({
      activeEntitlements: info.activeEntitlements,
      isPro,
      status: isPro ? "active" : info.isTrialing ? "trial" : "none",
      productId: null,
      expiresAt: null,
    });
  },

  reset: () => set(initial),
}));
