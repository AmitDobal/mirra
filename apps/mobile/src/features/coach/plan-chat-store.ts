import { create } from "zustand";

import { planChatCopy } from "@/content/plan-chat";
import { useFuelStore } from "@/features/fuel/fuel-store";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useTodayStore } from "@/features/today/today-store";
import {
  getAiUsage,
  getCurrentPlan,
  postCoachRevise,
  postCoachReviseApply,
  type CoachReviseBody,
  type CoachReviseChange,
  type CoachReviseResponse,
  type DayMealPlan,
  type ReviseItem,
  type UsageWindow,
} from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";
import { usePlanStore } from "@/stores/plan-store";

import { stripPreviewPrefix } from "./proposal/proposal-model";

/** `stale`: the server refused the draft (409 plan_changed / 410 draft_gone). */
export type ProposalStatus = "pending" | "applied" | "dismissed" | "stale";

/** A dry-run revise result waiting for the user's explicit yes. Nothing is persisted until confirmed. */
export type PlanProposal = {
  readonly status: ProposalStatus;
  /** v2: "Yes, apply" commits exactly this stored draft. Null on older APIs (legacy intent echo). */
  readonly draftId: string | null;
  /** Legacy confirm request (`dryRun:false` + echoed intent), used only when `draftId` is null. */
  readonly request: CoachReviseBody;
  /** v2 typed diff rows; the card falls back to `changes` when absent. */
  readonly items?: readonly ReviseItem[];
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
  /** "Yes, apply" — commit the previewed draft (v2) or replay the intent (legacy), then refresh plans. */
  readonly confirm: (id: string) => Promise<void>;
  /** "Want to change" — drop the proposal and unlock the composer for a refinement. */
  readonly dismiss: (id: string) => void;
  readonly reset: () => void;
};

const WELCOME: PlanChatMessage = {
  id: "welcome",
  role: "coach",
  text: planChatCopy.welcome,
};

const todayIso = () => new Date().toISOString().slice(0, 10);

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${(seq += 1)}`;

const friendlyError = (err: unknown): string => {
  if (err instanceof MirraApiError && err.status === 429) return planChatCopy.error.limit;
  if (err instanceof MirraApiError && err.status === 400) return planChatCopy.error.vague;
  return planChatCopy.error.offline;
};

/** 409 plan_changed / 410 draft_gone / 404: the draft can't be applied; ask for a resend. */
const staleReply = (err: unknown): string | null => {
  if (!(err instanceof MirraApiError)) return null;
  if (err.status === 409 || err.code === "plan_changed") return planChatCopy.reply.planChanged;
  if (err.status === 410 || err.status === 404 || err.code === "draft_gone") {
    return err.message.trim() || planChatCopy.reply.draftGone;
  }
  return null;
};

const commit = (proposal: PlanProposal): Promise<CoachReviseResponse> =>
  proposal.draftId ? postCoachReviseApply(proposal.draftId) : postCoachRevise(proposal.request);

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
  res?: CoachReviseResponse,
): readonly PlanChatMessage[] =>
  patchMessage(messages, id, (m) =>
    m.proposal
      ? {
          ...m,
          proposal: {
            ...m.proposal,
            status,
            changes: res?.changes ?? m.proposal.changes,
            items: res?.items && res.items.length > 0 ? res.items : m.proposal.items,
          },
        }
      : m,
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
      const proposes = res.changes.length > 0 || (res.items?.length ?? 0) > 0;
      // Confirm replays the resolved intent so "Yes" applies exactly what was previewed.
      const confirmRequest: CoachReviseBody = {
        ...request,
        dryRun: false,
        ...(res.intent ? { intent: res.intent } : {}),
      };
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id,
            role: "coach",
            text: stripPreviewPrefix(res.message),
            warnings: res.warnings,
            ...(proposes
              ? {
                  proposal: {
                    status: "pending" as const,
                    draftId: res.draftId ?? null,
                    request: confirmRequest,
                    items: res.items,
                    changes: res.changes,
                  },
                }
              : {}),
          },
        ],
        pendingId: proposes ? id : null,
        loading: false,
      }));
      logger.info("plan-chat.revise.preview", {
        changes: res.changes.length,
        items: res.items?.length ?? 0,
        draft: res.draftId != null,
        source: res.source,
      });
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
      const res = await commit(proposal);
      if (!res.applied) {
        // Plan drifted since the preview: nothing was written, so don't claim it was.
        set((s) => ({
          messages: [
            ...setProposalStatus(s.messages, id, "dismissed"),
            { id: nextId("c"), role: "coach", text: planChatCopy.reply.nothingToApply },
          ],
          pendingId: null,
          applying: false,
        }));
        return;
      }
      set((s) => ({
        messages: [
          ...setProposalStatus(s.messages, id, "applied", res),
          { id: nextId("c"), role: "coach", text: planChatCopy.reply.applied, warnings: res.warnings },
        ],
        pendingId: null,
        applying: false,
      }));
      logger.info("plan-chat.revise.applied", { changes: res.changes.length, source: res.source });
      await refreshPlans(res.mealPlan ?? null);
      if (res.source === "openai") await get().loadUsage();
    } catch (err) {
      const status = err instanceof MirraApiError ? err.status : undefined;
      const stale = staleReply(err);
      if (stale) {
        logger.info("plan-chat.apply.stale", { status });
        // Draft is dead server-side: disable the card and unlock the composer for a resend.
        set((s) => ({
          messages: [...setProposalStatus(s.messages, id, "stale"), { id: nextId("c"), role: "coach", text: stale }],
          pendingId: null,
          applying: false,
        }));
        return;
      }
      logger.error("plan-chat.apply.failed", { message: errorMessage(err), status });
      // Keep the proposal pending so the user can retry or back out.
      set({ applying: false, error: friendlyError(err) });
    }
  },

  dismiss: (id) => {
    if (get().applying) return;
    set((s) => ({
      messages: [
        ...setProposalStatus(s.messages, id, "dismissed"),
        { id: nextId("c"), role: "coach", text: planChatCopy.reply.dismissed },
      ],
      pendingId: s.pendingId === id ? null : s.pendingId,
      error: null,
    }));
  },
}));
