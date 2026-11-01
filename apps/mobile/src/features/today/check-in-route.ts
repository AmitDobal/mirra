import { router } from "expo-router";

/**
 * Single entry point for the daily check-in (Energy · Sleep · Soreness).
 * Today currently opens the Coach check-in; AMI-139 repoints this one constant
 * to the tap-based check-in route without touching Today UI.
 */
export const CHECK_IN_ROUTE = "/(tabs)/coach" as const;

export const openCheckIn = (): void => {
  router.push(CHECK_IN_ROUTE);
};
