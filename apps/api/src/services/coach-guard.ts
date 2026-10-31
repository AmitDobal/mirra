import type { ScenarioFacts } from "./accountability-scenarios";
import { signedDelta } from "./accountability-scenarios";
import type { AccountabilityScenario } from "@mirra/contracts";

/** True when `text` contains `n` as digits, with or without a thousands separator. */
const cites = (text: string, n: number): boolean => {
  const plain = String(Math.abs(Math.round(n)));
  return text.includes(plain) || text.includes(Number(plain).toLocaleString("en-US"));
};

/**
 * Cheap check that an LLM coach message actually cites the numbers behind a call-out.
 * When it fails the advisor falls back to the deterministic copy (same facts as Today).
 */
export const citesScenarioFacts = (
  scenario: AccountabilityScenario,
  facts: ScenarioFacts,
  message: string,
): boolean => {
  switch (scenario) {
    case "OVER_KCAL":
      return (
        cites(message, facts.kcalLogged) &&
        (cites(message, facts.kcalTarget) ||
          cites(message, signedDelta(facts.kcalLogged, facts.kcalTarget)))
      );
    case "UNDER_PROTEIN":
      return (
        cites(message, facts.proteinGLogged) ||
        cites(message, facts.proteinGTarget - facts.proteinGLogged)
      );
    case "UNDER_EATING":
      return cites(message, facts.kcalLogged) || cites(message, facts.kcalTarget);
    case "MISSED_LIFT":
      return (
        (facts.workoutTitle != null && message.includes(facts.workoutTitle)) ||
        /missed|skipped|tomorrow/i.test(message)
      );
    default:
      return true;
  }
};
