import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

/**
 * Android hardware back on a cold-linked screen (no stack history) would exit the app.
 * With history, back pops as usual; without it, `onNoHistory` runs instead (e.g. replace
 * to a tab). Mirrors the header back fallback on the same screen.
 */
export const useColdBackFallback = (onNoHistory: () => void): void => {
  const handler = useRef(onNoHistory);
  handler.current = onNoHistory;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) return false;
      handler.current();
      return true;
    });
    return () => sub.remove();
  }, []);
};
