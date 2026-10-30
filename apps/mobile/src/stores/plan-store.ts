import { create } from "zustand";

import type { CurrentPlan, PlanJobResponse } from "@/lib/api/types";

type PlanState = {
  readonly plan: CurrentPlan | null;
  readonly job: PlanJobResponse | null;
  readonly jobId: string | null;
  readonly updatedAt: number | null;
  readonly setPlan: (plan: CurrentPlan | null) => void;
  readonly setJob: (jobId: string, job: PlanJobResponse | null) => void;
  readonly clear: () => void;
};

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  job: null,
  jobId: null,
  updatedAt: null,

  setPlan: (plan) =>
    set({
      plan,
      updatedAt: plan ? Date.now() : null,
    }),

  setJob: (jobId, job) => set({ jobId, job }),

  clear: () =>
    set({
      plan: null,
      job: null,
      jobId: null,
      updatedAt: null,
    }),
}));
