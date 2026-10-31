import { copy } from "@/content/copy";
import { setCached } from "@/db";
import { withAiCache } from "@/lib/ai";
import {
  postCoachAdvise,
  type CoachAdviseResponse,
  type CoachPill,
  type CoachVector,
} from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";
import { usePersonaStore } from "@/features/trainer/persona-store";

export const FALLBACK_VECTORS: readonly CoachVector[] = [
  {
    id: "missed",
    title: "Missed Session Recalibration",
    recommended: true,
    detail: "Redistribute missed volume across remaining microcycle days.",
  },
  {
    id: "deload",
    title: "Deload / Low Readiness",
    recommended: false,
    detail: "Drop load and swap high-strain compounds for active flow.",
  },
  {
    id: "express",
    title: "20-Min Express Compression",
    recommended: false,
    detail: "High-density supersets preserving top compound mechanics.",
  },
];

const ADVISE_TTL_MS = 15 * 60_000;
const ADVISE_MIN_REFRESH_MS = 60_000;
const COACH_OFFLINE_NOTICE = "Coach offline — showing saved tips";

const todayIso = () => new Date().toISOString().slice(0, 10);

const adviseKey = (localDate: string, readiness: string, vectorId: string, persona: string) =>
  `advise:${persona}:${localDate}:${readiness}:${vectorId}`;

const fallbackFor = (readiness: "push" | "rest") =>
  readiness === "rest" ? copy.coach.fallbackRest : copy.coach.fallbackMessage;

/** Ignore responses that land after a newer request started. */
let adviseSeq = 0;

/** The slice of coach state `runAdvise` reads/writes. */
export type AdviseSlice = {
  readonly readiness: "push" | "rest";
  readonly vectorId: string;
  readonly vectors: readonly CoachVector[];
  readonly adviseMessage: string;
  readonly advisePills: readonly CoachPill[];
  readonly adviseLoading: boolean;
  readonly adviseCachedAt: number | null;
  readonly adviseThrottled: boolean;
  readonly notice: string | null;
};

/**
 * Cache-first advise fetch (15 min TTL). `force` bypasses the TTL but is
 * throttled to one network call per 60s per key.
 */
export const runAdvise = async (
  get: () => AdviseSlice,
  set: (partial: Partial<AdviseSlice>) => void,
  force: boolean,
): Promise<void> => {
  const { readiness, vectorId } = get();
  const localDate = todayIso();
  const persona = usePersonaStore.getState().persona;
  const key = adviseKey(localDate, readiness, vectorId, persona);
  const seq = ++adviseSeq;
  set({ adviseLoading: true, adviseThrottled: false });
  try {
    const result = await withAiCache<CoachAdviseResponse>({
      key,
      ttlMs: ADVISE_TTL_MS,
      force,
      minRefreshMs: ADVISE_MIN_REFRESH_MS,
      fetch: () => postCoachAdvise({ readiness, vectorId, localDate }),
    });
    if (seq !== adviseSeq) return;
    const res = result.data;
    const message = res.coachMessage ?? res.message;
    const vectors =
      res.vectors && res.vectors.length > 0 ? res.vectors : FALLBACK_VECTORS;
    const nextId = vectors.some((v) => v.id === vectorId)
      ? vectorId
      : (vectors.find((v) => v.recommended)?.id ?? vectors[0]?.id ?? vectorId);
    set({
      adviseMessage: message || fallbackFor(readiness),
      advisePills: res.pills ?? [],
      vectors,
      vectorId: nextId,
      adviseLoading: false,
      adviseCachedAt: result.cachedAt,
      adviseThrottled: result.throttled,
    });
    if (!result.fromCache && nextId !== vectorId) {
      // Server picked another vector: alias the cache so remounts still hit.
      void setCached(adviseKey(localDate, readiness, nextId, persona), res, ADVISE_TTL_MS).catch(
        () => undefined,
      );
    }
    logger.info("coach.advise.ok", {
      source: res.source ?? "unknown",
      fromCache: result.fromCache,
      throttled: result.throttled,
    });
  } catch (err) {
    if (seq !== adviseSeq) return;
    logger.error("coach.advise.failed", {
      message: errorMessage(err),
      status: err instanceof MirraApiError ? err.status : undefined,
      code: err instanceof MirraApiError ? err.code : undefined,
    });
    set({
      adviseMessage: fallbackFor(readiness),
      advisePills: [],
      vectors: FALLBACK_VECTORS,
      adviseLoading: false,
      adviseCachedAt: null,
      notice: COACH_OFFLINE_NOTICE,
    });
  }
};
