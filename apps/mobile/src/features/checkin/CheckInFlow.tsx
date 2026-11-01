import { router } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect } from "react";
import { StyleSheet } from "react-native";

import { timing } from "@/features/fuel/snap/motion";
import { color } from "@/theme/tokens";

import { CheckInResult } from "./CheckInResult";
import { CheckInScreen } from "./CheckInScreen";
import { useCheckInStore } from "./checkin-store";

/** Sheet-style enter and light phase crossfade (meal-snap feel). */
const ENTER_MS = 200;
const FADE_MS = 160;

/** Daily check-in: S20b taps → S20c result. Leaving always lands on Today. */
export const CheckInFlow = () => {
  const phase = useCheckInStore((s) => s.phase);
  const reset = useCheckInStore((s) => s.reset);

  // Fresh form each time the route mounts; clear on leave.
  useEffect(() => {
    reset();
    return reset;
  }, [reset]);

  const handleClose = useCallback(() => {
    router.replace("/(tabs)/today");
  }, []);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={timing({ duration: ENTER_MS })}
      style={styles.root}
    >
      <AnimatePresence exitBeforeEnter>
        <MotiView
          key={phase}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={timing({ duration: FADE_MS })}
          style={styles.root}
        >
          {phase === "input" ? <CheckInScreen onClose={handleClose} /> : <CheckInResult onDone={handleClose} />}
        </MotiView>
      </AnimatePresence>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
});
