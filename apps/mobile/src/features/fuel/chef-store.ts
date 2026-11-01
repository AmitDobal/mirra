import { create } from "zustand";

import {
  generateRecipe,
  getRecipeDetail,
  isOutOfCredits,
  MirraApiError,
  sendChefMessage,
  type ChefThread,
  type ChefTurn,
  type RecipeDetail,
} from "@/lib/api";
import { openAiLimitSheet } from "@/features/you/AiLimitSheet";
import { errorMessage, logger } from "@/lib/logger";

/** A message row. `local` rows exist only on this device (guard / refusal notices, unsent text). */
export type ChefMessage = ChefTurn & { readonly local?: boolean };

type ChefState = {
  readonly mealId: string | null;
  readonly detail: RecipeDetail | null;
  readonly messages: readonly ChefMessage[];
  readonly loading: boolean;
  readonly generating: boolean;
  readonly sending: boolean;
  readonly error: string | null;
  /** 402: AI credits empty. Chat history stays readable; heuristic tips stay free. */
  readonly outOfCredits: boolean;
  /** Message that hit the 402, so "Use free tips" can resend it. */
  readonly pendingMessage: string | null;
  /** 409 `thread_capped`. */
  readonly capped: boolean;
  readonly open: (mealId: string) => Promise<void>;
  readonly close: () => void;
  readonly send: (text: string, opts?: { heuristic?: boolean }) => Promise<void>;
  readonly generate: () => Promise<void>;
};

const INITIAL = {
  mealId: null,
  detail: null,
  messages: [],
  loading: false,
  generating: false,
  sending: false,
  error: null,
  outOfCredits: false,
  pendingMessage: null,
  capped: false,
} as const;

const OFFLINE = "You're offline. Chef needs a connection.";
const RETRY = "Chef couldn't answer. Try again.";

let localSeq = 0;
const localTurn = (role: ChefTurn["role"], text: string, idx: number): ChefMessage => ({
  id: `local-${(localSeq += 1)}`,
  idx,
  role,
  text,
  local: true,
});

const nextIdx = (messages: readonly ChefMessage[]) => (messages.at(-1)?.idx ?? -1) + 1;

const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const withThread = (detail: RecipeDetail | null, thread: ChefThread): RecipeDetail | null =>
  detail ? { ...detail, thread } : null;

export const useChefStore = create<ChefState>((set, get) => ({
  ...INITIAL,

  open: async (mealId) => {
    set({ ...INITIAL, mealId, loading: true });
    try {
      const detail = await getRecipeDetail(mealId);
      if (get().mealId !== mealId) return;
      set({
        detail,
        messages: detail.turns,
        loading: false,
        capped: detail.thread ? detail.thread.turnsLeft === 0 : false,
      });
    } catch (err) {
      logger.warn("chef.open_failed", { message: errorMessage(err) });
      if (get().mealId === mealId) {
        set({ loading: false, error: err instanceof MirraApiError ? RETRY : OFFLINE });
      }
    }
  },

  close: () => set({ ...INITIAL }),

  generate: async () => {
    const { mealId, generating } = get();
    if (!mealId || generating) return;
    set({ generating: true, error: null, outOfCredits: false });
    try {
      const detail = await generateRecipe(mealId);
      set({ detail, generating: false });
    } catch (err) {
      logger.warn("chef.generate_failed", { message: errorMessage(err) });
      if (isOutOfCredits(err)) {
        openAiLimitSheet();
        set({ generating: false, outOfCredits: true });
      } else set({ generating: false, error: err instanceof MirraApiError ? RETRY : OFFLINE });
    }
  },

  send: async (text, opts) => {
    const message = text.trim();
    const { mealId, sending, messages } = get();
    if (!mealId || !message || sending) return;
    const pending = localTurn("user", message, nextIdx(messages));
    set({ sending: true, error: null, outOfCredits: false, pendingMessage: null, messages: [...messages, pending] });
    const withoutPending = () => get().messages.filter((m) => m.id !== pending.id);
    try {
      const res = await sendChefMessage({ mealId, message, clientRequestId: requestId() }, opts);
      const reply = localTurn("assistant", res.reply, pending.idx + 1);
      set({
        sending: false,
        messages: [...get().messages, reply],
        detail: withThread(get().detail, res.thread),
        capped: res.thread.turnsLeft === 0,
      });
    } catch (err) {
      logger.warn("chef.send_failed", { message: errorMessage(err) });
      if (isOutOfCredits(err)) {
        openAiLimitSheet();
        set({ sending: false, messages: withoutPending(), outOfCredits: true, pendingMessage: message });
      } else if (err instanceof MirraApiError && err.code === "thread_capped") {
        set({ sending: false, messages: withoutPending(), capped: true });
      } else if (err instanceof MirraApiError && err.code === "constraint_violation") {
        set({ sending: false, messages: [...get().messages, localTurn("assistant", err.message, pending.idx + 1)] });
      } else {
        set({ sending: false, messages: withoutPending(), pendingMessage: message, error: err instanceof MirraApiError ? RETRY : OFFLINE });
      }
    }
  },
}));
