import { create } from "zustand";

import { useFuelStore } from "@/features/fuel/fuel-store";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useTodayStore } from "@/features/today/today-store";
import {
  getAiUsage,
  getCurrentPlan,
  postCoachRevise,
  type CoachReviseBody,
  type CoachReviseChange,
  type DayMealPlan,
  type UsageWindow,
} from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";
import { usePlanStore } from "@/stores/plan-store";

import { stripPreviewPrefix } from "./proposal-rows";

export type ProposalStatus = "pending" | "applied" | "dismissed";

/** A dry-run revise result waiting for the user's explicit yes. Nothing is persisted until confirmed. */
export type PlanProposal = {
  readonly status: ProposalStatus;
  readonly request: CoachReviseBody;
  readonly changes: readonly CoachReviseChange[];
};

export type PlanChatMessage = {
  readonly id: string;
  readonly role: "user" | "coach";
  readonly text: string;
  readonly changes?: readonly CoachReviseChange[];
  readonly warnings?: readonly string[];
  readonly proposal?: PlanProposal;
};

type PlanChatState = {
  readonly messages: readonly PlanChatMessage[];
  readonly loading: boolean;
  readonly error: string | null;
  /** Message id of the proposal awaiting Yes / Want to change. Composer is locked while set. */
  readonly pendingId: string | null;
  /** True while the confirmed (dryRun: false) call is in flight. */
  readonly applying: boolean;
  /** AI (LLM) replies used today; chips/rules are free and never counted. */
  readonly reviseUsage: UsageWindow | null;
  readonly loadUsage: () => Promise<void>;
  readonly send: (text: string) => Promise<void>;
  /** "Yes, apply" — repeat the same request with dryRun: false, then refresh plans. */
  readonly confirm: (id: string) => Promise<void>;
  /** "Want to change" — drop the proposal and unlock the composer for a refinement. */
  readonly dismiss: (id: string) => void;
  readonly reset: () => void;
};

const WELCOME: PlanChatMessage = {
  id: "welcome",
  role: "coach",
  text: "Tell me what to change: equipment you don't have, lifts you prefer, foods to avoid, or a shorter session. I'll show you the change first. Nothing updates until you say yes.",
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

const patchMessage = (
  messages: readonly PlanChatMessage[],
  id: string,
  patch: (m: PlanChatMessage) => PlanChatMessage,
): readonly PlanChatMessage[] => messages.map((m) => (m.id === id ? patch(m) : m));

const setProposalStatus = (
  messages: readonly PlanChatMessage[],
  id: string,
  status: ProposalStatus,
  changes?: readonly CoachReviseChange[],
): readonly PlanChatMessage[] =>
  patchMessage(messages, id, (m) =>
    m.proposal ? { ...m, proposal: { ...m.proposal, status, changes: changes ?? m.proposal.changes } } : m,
  );

export const usePlanChatStore = create<PlanChatState>((set, get) => ({
  messages: [WELCOME],
  loading: false,
  error: null,
  pendingId: null,
  applying: false,
  reviseUsage: null,

  loadUsage: async () => {
    try {
      set({ reviseUsage: (await getAiUsage()).features.revise });
    } catch (err) {
      logger.warn("plan-chat.usage_failed", { message: errorMessage(err) });
    }
  },

  reset: () => set({ messages: [WELCOME], loading: false, error: null, pendingId: null, applying: false }),

  send: async (raw) => {
    const text = raw.trim();
    if (!text || get().loading || get().pendingId) return;
    set((s) => ({
      messages: [...s.messages, { id: nextId("u"), role: "user", text }],
      loading: true,
      error: null,
    }));
    const request: CoachReviseBody = { message: text, scope: "auto", date: todayIso(), dryRun: true };
    try {
      const res = await postCoachRevise(request);
      const id = nextId("c");
      const proposes = res.changes.length > 0;
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id,
            role: "coach",
            text: stripPreviewPrefix(res.message),
            warnings: res.warnings,
            ...(proposes
              ? { proposal: { status: "pending" as const, request: { ...request, dryRun: false }, changes: res.changes } }
              : {}),
          },
        ],
        pendingId: proposes ? id : null,
        loading: false,
      }));
      logger.info("plan-chat.revise.preview", { changes: res.changes.length, source: res.source });
      if (res.source === "openai") await get().loadUsage();
    } catch (err) {
      logger.error("plan-chat.revise.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
      set({ loading: false, error: friendlyError(err) });
    }
  },

  confirm: async (id) => {
    const proposal = get().messages.find((m) => m.id === id)?.proposal;
    if (!proposal || proposal.status !== "pending" || get().applying) return;
    set({ applying: true, error: null });
    try {
      const res = await postCoachRevise(proposal.request);
      if (!res.applied) {
        // Plan drifted since the preview: nothing was written, so don't claim it was.
        set((s) => ({
          messages: [
            ...setProposalStatus(s.messages, id, "dismissed"),
            { id: nextId("c"), role: "coach", text: "Nothing needed changing anymore, so your plan stays as is." },
          ],
          pendingId: null,
          applying: false,
        }));
        return;
      }
      set((s) => ({
        messages: [
          ...setProposalStatus(s.messages, id, "applied", res.changes),
          { id: nextId("c"), role: "coach", text: "Done. Your plan is updated.", warnings: res.warnings },
        ],
        pendingId: null,
        applying: false,
      }));
      logger.info("plan-chat.revise.applied", { changes: res.changes.length, source: res.source });
      await refreshPlans(res.mealPlan ?? null);
      if (res.source === "openai") await get().loadUsage();
    } catch (err) {
      logger.error("plan-chat.apply.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
      // Keep the proposal pending so the user can retry or back out.
      set({ applying: false, error: friendlyError(err) });
    }
  },

  dismiss: (id) => {
    if (get().applying) return;
    set((s) => ({
      messages: [
        ...setProposalStatus(s.messages, id, "dismissed"),
        { id: nextId("c"), role: "coach", text: "No problem. Nothing changed. Tell me what you'd like instead." },
      ],
      pendingId: s.pendingId === id ? null : s.pendingId,
      error: null,
    }));
  },
}));
