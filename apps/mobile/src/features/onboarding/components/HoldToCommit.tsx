import * as Haptics from "expo-haptics";
import { Fingerprint } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { color, font, radius } from "@/theme/tokens";

export const HOLD_MS = 1200;

type Props = {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint: string;
  readonly onCommit: () => void;
};

/**
 * S43 hold-to-commit: 56 pt lime pill, a darker fill grows over 1.2 s while held, success
 * haptic on completion. Screen readers get a plain "activate" action (arch §7).
 */
export const HoldToCommit = ({ label, accessibilityLabel, accessibilityHint, onCommit }: Props) => {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const complete = () => {
    if (done.current) return;
    done.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onCommit();
    // Re-arm for Back from auth (the screen stays mounted under the pushed route).
    timer.current = setTimeout(() => {
      done.current = false;
      progress.value = 0;
    }, 1000);
  };

  const handlePressIn = () => {
    if (done.current) return;
    progress.value = withTiming(1, { duration: HOLD_MS });
    timer.current = setTimeout(complete, HOLD_MS);
  };

  const handlePressOut = () => {
    if (done.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 180 });
  };

  const handleA11yAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "activate") complete();
  };

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={handleA11yAction}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pill}
    >
      <Animated.View style={[styles.fill, fillStyle]} />
      <View style={styles.content}>
        <Fingerprint size={22} color={color.onPrimaryFixed} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    width: "100%",
    height: 56,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: color.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: color.primaryFixedDim },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: font.label, fontSize: 15, lineHeight: 20, color: color.onPrimaryFixed },
});
