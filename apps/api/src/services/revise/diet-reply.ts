import { findBannedTerm, resolveDietConstraints } from "../../lib/diet-constraints";
import { logDietGuard } from "../../lib/diet-guard";
import type { ReviseState } from "./context";

/** Neutral line when the reviser's own sentence named a banned food (AMI-199). */
export const DIET_SAFE_REPLY = "Here is a change that fits your food settings.";

/**
 * AMI-199: the plan-chat LLM writes its reply before the server picks dishes, so it could name
 * a food the user must never be offered ("swapping lunch for steak"). Dishes are already safe;
 * this keeps the coach line safe too.
 */
export const dietSafeReply = (message: string, state: ReviseState, timezone: string | null): string => {
  const c = resolveDietConstraints({
    dietTags: state.dietTags,
    foodsAvoid: state.foodsAvoid,
    cuisineStyles: state.cuisineStyles,
    hintText: state.prefs?.lifestyleNotes,
    timezone,
  });
  const bad = findBannedTerm(message, c);
  if (!bad) return message;
  logDietGuard("plan_chat.reply", { term: bad, groups: c.groups });
  return DIET_SAFE_REPLY;
};
