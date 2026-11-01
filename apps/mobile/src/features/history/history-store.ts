import { create } from "zustand";

import { listRollupDays, upsertRollupDays } from "@/db";
import {
  getNutritionSummary,
  getWorkoutSummary,
  listMealsApi,
  type HistoryRange,
  type Meal,
  type WorkoutSummary,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import {
  historyCacheKey,
  isFresh,
  isUsableEntry,
  type HistoryCacheEntry,
} from "./history-cache";
import {
  computeKpis,
  fromRollups,
  hasAnyData,
  historyWindow,
  macroAverages,
  mergeSummaries,
  shiftAnchor,
  todayIso,
  toRollups,
  type HistoryDay,
  type HistoryKpis,
  type HistoryWindow,
  type MacroAverages,
} from "./history-model";

const MEALS_PAGE = 5;
const MEALS_EXPANDED_PAGE = 20;

type LoadOptions = { readonly force?: boolean };

type HistoryState = {
  readonly range: HistoryRange;
  readonly anchor: string;
  readonly window: HistoryWindow;
  readonly days: readonly HistoryDay[];
  readonly kpis: HistoryKpis;
  readonly macros: MacroAverages;
  readonly hasData: boolean;
  /** `cache` = SQLite rollup shown (offline / before the network answers). */
  readonly source: "none" | "cache" | "live";
  readonly loading: boolean;
  readonly error: string | null;
  readonly meals: readonly Meal[];
  readonly mealsCursor: string | null;
  readonly mealsExpanded: boolean;
  /** Epoch ms of the last successful summary fetch (any window). */
  readonly lastSuccessfulFetchAt: number | null;
  /** Epoch ms of the last successful recent-meals fetch. */
  readonly mealsFetchedAt: number | null;
  /** In-memory API cache keyed by `range|anchor`; entries live for HISTORY_TTL_MS. */
  readonly cacheByKey: Readonly<Record<string, HistoryCacheEntry>>;
  readonly setRange: (range: HistoryRange) => Promise<void>;
  readonly shift: (dir: -1 | 1) => Promise<void>;
  /** `force` skips the 1h TTL (pull-to-refresh). */
  readonly load: (opts?: LoadOptions) => Promise<void>;
  readonly loadMeals: (opts?: LoadOptions) => Promise<void>;
  /** Drop cached API data so the next load hits the network (e.g. after logging a meal). */
  readonly invalidate: () => void;
  readonly expandMeals: () => Promise<void>;
};

const derive = (
  range: HistoryRange,
  anchor: string,
  days: readonly HistoryDay[],
  workouts: WorkoutSummary | null,
) => ({
  range,
  anchor,
  window: historyWindow(range, anchor),
  days,
  kpis: computeKpis(days, workouts),
  macros: macroAverages(days),
  hasData: hasAnyData(days),
});

const initial = (range: HistoryRange, anchor: string) => {
  const w = historyWindow(range, anchor);
  return derive(range, anchor, fromRollups(w, []), null);
};

/** Latest-request guard: a slow response for an old window must not overwrite a newer one. */
let requestSeq = 0;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  ...initial("week", todayIso()),
  source: "none",
  loading: false,
  error: null,
  meals: [],
  mealsCursor: null,
  mealsExpanded: false,
  lastSuccessfulFetchAt: null,
  mealsFetchedAt: null,
  cacheByKey: {},

  invalidate: () => set({ cacheByKey: {}, lastSuccessfulFetchAt: null, mealsFetchedAt: null }),

  setRange: async (range) => {
    if (range === get().range) return;
    set({ ...initial(range, get().anchor), source: "none", error: null, loading: true });
    await get().load();
  },

  shift: async (dir) => {
    const { range, anchor } = get();
    const next = shiftAnchor(range, anchor, dir);
    set({ ...initial(range, next), source: "none", error: null, loading: true });
    await get().load();
  },

  load: async (opts) => {
    const seq = ++requestSeq;
    const { range, anchor } = get();
    const w = historyWindow(range, anchor);
    const key = historyCacheKey(range, anchor);

    // 0) TTL gate: fresh data for this exact range + anchor → no network.
    const entry = get().cacheByKey[key];
    if (!opts?.force && isUsableEntry(entry)) {
      set({
        ...derive(range, anchor, entry.days, entry.workouts),
        source: "live",
        loading: false,
        error: null,
      });
      logger.info("history.cache.hit", { key, ageMs: Date.now() - entry.fetchedAt });
      return;
    }
    logger.info("history.cache.miss", {
      key,
      reason: opts?.force ? "force" : entry ? "stale" : "empty",
    });
    set({ loading: true, error: null });

    // 1) Instant paint from the SQLite rollup cache.
    try {
      const cached = await listRollupDays(w.from, w.to);
      if (seq === requestSeq && cached.length > 0) {
        set({ ...derive(range, anchor, fromRollups(w, cached), null), source: "cache" });
      }
    } catch (err) {
      logger.warn("history.cache.read", { message: errorMessage(err) });
    }

    // 2) Network: nutrition is required, workouts are best-effort.
    try {
      const [nutrition, workouts] = await Promise.all([
        getNutritionSummary(range, anchor),
        getWorkoutSummary(range, anchor).catch((err: unknown) => {
          logger.warn("history.workouts", { message: errorMessage(err) });
          return null;
        }),
      ]);
      if (seq !== requestSeq) return;
      const days = mergeSummaries(w, nutrition, workouts);
      const fetchedAt = Date.now();
      set({
        ...derive(range, anchor, days, workouts),
        source: "live",
        loading: false,
        lastSuccessfulFetchAt: fetchedAt,
        cacheByKey: { ...get().cacheByKey, [key]: { days, workouts, fetchedAt } },
      });
      void upsertRollupDays(toRollups(days)).catch((err: unknown) =>
        logger.warn("history.cache.write", { message: errorMessage(err) }),
      );
    } catch (err) {
      if (seq !== requestSeq) return;
      const hasCache = get().source === "cache";
      set({
        loading: false,
        error: hasCache ? null : "Couldn't load history. Pull to retry.",
      });
      logger.warn("history.load", { message: errorMessage(err) });
    }
  },

  loadMeals: async (opts) => {
    const { mealsFetchedAt, meals } = get();
    if (!opts?.force && meals.length > 0 && isFresh(mealsFetchedAt)) {
      logger.info("history.meals.cache.hit", { ageMs: Date.now() - (mealsFetchedAt ?? 0) });
      return;
    }
    try {
      const page = await listMealsApi(null, MEALS_PAGE);
      set({
        meals: page.items,
        mealsCursor: page.nextCursor,
        mealsExpanded: false,
        mealsFetchedAt: Date.now(),
      });
    } catch (err) {
      logger.warn("history.meals", { message: errorMessage(err) });
    }
  },

  expandMeals: async () => {
    try {
      const page = await listMealsApi(null, MEALS_EXPANDED_PAGE);
      set({
        meals: page.items,
        mealsCursor: page.nextCursor,
        mealsExpanded: true,
        mealsFetchedAt: Date.now(),
      });
    } catch (err) {
      logger.warn("history.meals", { message: errorMessage(err) });
    }
  },
}));
