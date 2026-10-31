import type {
  CoachAdviseInput,
  CoachAdviseResult,
  CoachAdvisor,
} from "../ports/coach-advisor";
import { coachScenarioMessage } from "../services/accountability-copy";
import { styleHeuristicCopy } from "../services/trainer-persona";

const SKIP_STATUSES = new Set(["skipped", "travel", "low_sleep"]);

/** Deterministic coach copy when OpenAI is unavailable — uses personal context when present. */
export const heuristicCoachAdvisor: CoachAdvisor = {
  advise: async (input: CoachAdviseInput): Promise<CoachAdviseResult> => {
    const acc = input.accountability;
    const rebuildSuggested =
      SKIP_STATUSES.has(input.status) || acc?.scenario === "LOW_READINESS";
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

    let message: string;
    if (acc) {
      // Scenario copy cites logged/target/delta from the same facts as the insights tips.
      message = coachScenarioMessage(acc.scenario, acc.secondary, acc.facts);
    } else if (input.status === "done") {
      message = "Solid check-in. Keep the next session as planned.";
    } else if (input.status === "partial") {
      message =
        "Partial is still progress. Finish unfinished lifts tomorrow if energy allows.";
    } else if (input.status === "soreness") {
      message = "Honor the sore tissue — mobility today, push later this week.";
    } else if (input.status === "low_sleep") {
      message = "Sleep debt noted. Shorter session or deload is smart today.";
    } else if (input.status === "travel") {
      message =
        "Travel mode: bodyweight or hotel gym is enough. Rebuild when you land.";
    } else {
      message =
        "Missed day logged. Rebuild can shift the week so you stay consistent.";
    }

    return {
      message: styleHeuristicCopy(input.persona ?? "drill", message),
      vectors,
      rebuildSuggested,
      source: "heuristic",
      scenario: acc?.scenario,
    };
  },
};
