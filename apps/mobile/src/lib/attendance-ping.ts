import { useEffect } from "react";
import { AppState } from "react-native";

import { useAttendanceStore } from "@/features/today/attendance-store";
import { pingAttendance } from "@/lib/api";
import { hasSession } from "@/lib/auth/session";

/** At most one ping per 30 minutes of foreground time. */
export const PING_THROTTLE_MS = 30 * 60_000;

let lastPingAt = 0;

/** Silent, throttled. A failed ping does not start the throttle, so the next foreground retries. */
export const pingPresence = async (): Promise<void> => {
  if (!hasSession()) return;
  if (Date.now() - lastPingAt < PING_THROTTLE_MS) return;
  try {
    const week = await pingAttendance();
    lastPingAt = Date.now();
    useAttendanceStore.getState().merge(week);
  } catch {
    /* silent: retried on the next foreground */
  }
};

/** Pings once when the app is ready, then on every return to the foreground. */
export const useAttendancePing = (ready: boolean): void => {
  useEffect(() => {
    if (!ready) return;
    void pingPresence();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void pingPresence();
    });
    return () => sub.remove();
  }, [ready]);
};
