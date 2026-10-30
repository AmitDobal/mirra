import { router } from "expo-router";
import { MotiView } from "moti";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell } from "@/features/onboarding";

const GEN_MS = 2200;

/** S11 — Blocking generate beat (local stub, no API). */
const GeneratingScreen = () => {
  const c = onboardingCopy.generating;

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(onboarding)/week-reveal");
    }, GEN_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <OnboardingShell scroll={false}>
      <View className="flex-1 items-center justify-center gap-space-lg">
        <View className="w-full max-w-[280px] gap-space-sm">
          {[1, 0.72, 0.9, 0.55].map((w, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0.35 }}
              animate={{ opacity: 0.9 }}
              transition={{
                type: "timing",
                duration: 900,
                loop: true,
                delay: i * 120,
              }}
              className="h-3 rounded-full bg-surface-container-high"
              style={{ width: `${w * 100}%` }}
            >
              <View className="h-full w-1/3 rounded-full bg-primary-fixed/40" />
            </MotiView>
          ))}
        </View>
        <Text className="font-label text-label-caps text-on-surface-variant">
          {c.label}
        </Text>
        <MotiView
          from={{ width: "20%" }}
          animate={{ width: "88%" }}
          transition={{ type: "timing", duration: GEN_MS }}
          className="h-1 self-stretch rounded-full bg-primary-fixed"
        />
      </View>
    </OnboardingShell>
  );
};

export default GeneratingScreen;
