import { router } from "expo-router";
import { MotiView, type MotiTransition } from "moti";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius, space, type } from "@/theme/tokens";

const SPLASH_MS = 1400;

/** S01 — Brand beat, then welcome. */
const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const c = onboardingCopy.splash;

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(onboarding)/welcome");
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={c.wordmark}
    >
      <View style={styles.spacer} />
      <MotiView
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 700 } as MotiTransition}
        style={styles.center}
      >
        <Text style={styles.wordmark}>{c.wordmark}</Text>
        <View style={styles.accent} accessibilityElementsHidden />
      </MotiView>
      <View style={styles.bar} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.background,
    paddingHorizontal: space.margin,
  },
  spacer: {
    height: 32,
    width: "100%",
    opacity: 0,
  },
  center: {
    alignItems: "center",
  },
  wordmark: {
    textAlign: "center",
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: 1.68,
    color: color.primary,
    textTransform: "uppercase",
  },
  accent: {
    marginTop: 12,
    height: 3,
    width: 40,
    borderRadius: radius.full,
    backgroundColor: color.primaryFixed,
  },
  bar: {
    height: 4,
    width: 128,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHighest,
    opacity: 0.6,
  },
});

export default SplashScreen;
