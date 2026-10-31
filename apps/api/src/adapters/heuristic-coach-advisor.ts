import type {
  CoachAdviseInput,
  CoachAdviseResult,
  CoachAdvisor,
} from "../ports/coach-advisor";

const SKIP_STATUSES = new Set(["skipped", "travel", "low_sleep"]);

/** Deterministic coach copy when OpenAI is unavailable. */
export const heuristicCoachAdvisor: CoachAdvisor = {
  advise: async (input: CoachAdviseInput): Promise<CoachAdviseResult> => {
    const rebuildSuggested = SKIP_STATUSES.has(input.status);
    const vectors = rebuildSuggested
      ? [
          {
            id: "shift_train_days",
            title: "Shift remaining lifts",
            detail: "Move missed work one day forward and protect recovery.",
            recommended: true,
          },
          {
            id: "deload_volume",
            title: "Ease volume",
            detail: "Keep intensity, trim sets for the next two sessions.",
            recommended: input.status === "low_sleep",
          },
        ]
      : undefined;

    const message =
      input.status === "done"
        ? "Solid check-in. Keep the next session as planned."
        : input.status === "partial"
          ? "Partial is still progress. Finish the unfinished lifts tomorrow if energy allows."
          : input.status === "soreness"
            ? "Honor the sore tissue — mobility today, push later this week."
            : input.status === "low_sleep"
              ? "Sleep debt noted. Shorter session or deload is smart today."
              : input.status === "travel"
                ? "Travel mode: bodyweight or hotel gym is enough. Rebuild when you land."
                : "Missed day logged. Rebuild can shift the week so you stay consistent.";

    return { message, vectors, rebuildSuggested, source: "heuristic" };
  },
};
