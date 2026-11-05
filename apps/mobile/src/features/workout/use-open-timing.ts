import { useNavigation } from "expo-router";
import { useEffect } from "react";

import { logger } from "@/lib/logger";
import { navTimer } from "@/lib/perf/nav-timer";

const FRAME = "workout.live.frame";
const SETTLED = "workout.live.settled";

/** Call on "Start workout" press (store `start`). */
export const markWorkoutOpen = (): void => {
  navTimer.mark(FRAME);
  navTimer.mark(SETTLED);
};

/** Logs press → first frame and press → open transition end for the live HUD (AMI-175). */
export const useOpenTiming = (): void => {
  const navigation = useNavigation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const ms = navTimer.settle(FRAME);
      if (ms !== null) logger.info("perf.workout.first_frame", { ms });
    });
    const off = navigation.addListener("transitionEnd" as never, () => {
      const ms = navTimer.settle(SETTLED);
      if (ms !== null) logger.info("perf.workout.transition_end", { ms });
    });
    return () => {
      cancelAnimationFrame(frame);
      off();
    };
  }, [navigation]);
};
