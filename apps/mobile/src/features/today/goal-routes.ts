import type { Href } from "expo-router";

/** Where a server `ctaRoute` lands in the mobile app. */
export type GoalTarget =
  | { readonly kind: "workout" }
  | { readonly kind: "push"; readonly href: Href };

const FUEL_PLAN_HREF = "/(tabs)/fuel?section=plan" as Href;

/**
 * Map API `ctaRoute` (web-style paths) onto real expo-router screens.
 * `hasOpenPlannedMeal`: a meal-plan slot is waiting, so the log CTA opens the plan.
 */
export const resolveGoalRoute = (
  ctaRoute: string,
  hasOpenPlannedMeal = false,
): GoalTarget => {
  const path = ctaRoute.split("?")[0] ?? ctaRoute;
  if (path.startsWith("/workout/")) return { kind: "workout" };
  if (path === "/check-in") return { kind: "push", href: "/(tabs)/coach" };
  if (ctaRoute.includes("sheet=log") && hasOpenPlannedMeal) {
    return { kind: "push", href: FUEL_PLAN_HREF };
  }
  if (ctaRoute.includes("sheet=log")) return { kind: "push", href: "/(tabs)/log-meal" };
  if (ctaRoute.includes("sheet=water")) return { kind: "push", href: "/(tabs)/fuel" };
  return { kind: "push", href: ctaRoute as Href };
};
