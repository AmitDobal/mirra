import { router } from "expo-router";
import { MotiView } from "moti";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { onboardingCopy } from "@/content/onboarding";
import { color, space } from "@/theme/tokens";

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
      className="flex-1 items-center justify-between bg-background px-margin"
      style={{
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.xl,
      }}
      accessibilityRole="summary"
      accessibilityLabel={c.wordmark}
    >
      <View className="h-8 w-full opacity-0" />
      <MotiView
        from={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 700 }}
        className="items-center"
      >
        <Text
          className="text-center font-headline text-headline-lg uppercase text-primary"
          style={{ letterSpacing: 1.68 }}
        >
          {c.wordmark}
        </Text>
        <View
          className="mt-3 h-[3px] w-10 rounded-full bg-primary-fixed"
          accessibilityElementsHidden
        />
      </MotiView>
      <View
        className="h-1 w-32 rounded-full"
        style={{ backgroundColor: color.surfaceContainerHighest, opacity: 0.6 }}
      />
    </View>
  );
};

export default SplashScreen;
