import { router } from "expo-router";

import { useCheckInStore } from "./checkin-store";

export const CHECK_IN_ROUTE = "/(tabs)/coach";

/**
 * Open the daily check-in (S20b tap flow) from anywhere — e.g. a Today row (AMI-140).
 * Always starts on a fresh input form.
 */
export const openCheckIn = (): void => {
  useCheckInStore.getState().reset();
  router.push(CHECK_IN_ROUTE);
};
