import { create } from "zustand";

import { useFuelStore } from "@/features/fuel/fuel-store";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useTodayStore } from "@/features/today/today-store";
import {
  getAiUsage,
  getCurrentPlan,
  postCoachRevise,
  type CoachReviseChange,
  type DayMealPlan,
  type UsageWindow,
} from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";
import { usePlanStore } from "@/stores/plan-store";

export type PlanChatMessage = {
  readonly id: string;
  readonly role: "user" | "coach";
  readonly text: string;
  readonly changes?: readonly CoachReviseChange[];
  readonly warnings?: readonly string[];
};

type PlanChatState = {
  readonly messages: readonly PlanChatMessage[];
  readonly loading: boolean;
  readonly error: string | null;
  /** AI (LLM) replies used today; chips/rules are free and never counted. */
  readonly reviseUsage: UsageWindow | null;
  readonly loadUsage: () => Promise<void>;
  readonly send: (text: string) => Promise<void>;
  readonly reset: () => void;
};

const WELCOME: PlanChatMessage = {
  id: "welcome",
  role: "coach",
  text: "Tell me what to change: equipment you don't have, lifts you prefer, foods to avoid, or a shorter session. I'll edit your current plan.",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${(seq += 1)}`;

const friendlyError = (err: unknown): string => {
  if (err instanceof MirraApiError && err.status === 429) return "Plan chat limit reached for today.";
  if (err instanceof MirraApiError && err.status === 400) return "Say a bit more so I can change your plan.";
  return "Couldn't reach the coach. Try again.";
};

/** Pull the edited plans into the other tabs (server is the source of truth). */
const refreshPlans = async (mealPlan: DayMealPlan | null) => {
  try {
    const plan = await getCurrentPlan();
    if (plan) usePlanStore.getState().setPlan(plan);
  } catch (err) {
    logger.warn("plan-chat.refresh.plan_failed", { message: errorMessage(err) });
  }
  if (mealPlan) useMealPlanStore.setState({ plan: mealPlan });
  await Promise.all([
    useTodayStore.getState().hydrate(),
    useFuelStore.getState().hydrate(),
    mealPlan ? Promise.resolve() : useMealPlanStore.getState().hydrate(),
  ]).catch(() => undefined);
};

export const usePlanChatStore = create<PlanChatState>((set, get) => ({
  messages: [WELCOME],
  loading: false,
  error: null,
  reviseUsage: null,

  loadUsage: async () => {
    try {
      set({ reviseUsage: (await getAiUsage()).features.revise });
    } catch (err) {
      logger.warn("plan-chat.usage_failed", { message: errorMessage(err) });
    }
  },

  reset: () => set({ messages: [WELCOME], loading: false, error: null }),

  send: async (raw) => {
    const text = raw.trim();
    if (!text || get().loading) return;
    set((s) => ({
      messages: [...s.messages, { id: nextId("u"), role: "user", text }],
      loading: true,
      error: null,
    }));
    try {
      const res = await postCoachRevise({ message: text, scope: "auto", date: todayIso() });
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: nextId("c"),
            role: "coach",
            text: res.message,
            changes: res.changes,
            warnings: res.warnings,
          },
        ],
        loading: false,
      }));
      logger.info("plan-chat.revise.ok", { applied: res.applied, changes: res.changes.length, source: res.source });
      if (res.applied) await refreshPlans(res.mealPlan ?? null);
      if (res.source === "openai") await get().loadUsage();
    } catch (err) {
      logger.error("plan-chat.revise.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
      set({ loading: false, error: friendlyError(err) });
    }
  },
}));
