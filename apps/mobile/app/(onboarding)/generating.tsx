import { router } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { runOnboardingGenerate } from "@/features/onboarding/services/run-generate";

const MIN_MS = 1600;

/** S11 — PUT onboarding → generate plan → week-reveal. */
const GeneratingScreen = () => {
  const c = onboardingCopy.generating;
  const setWeekPlan = useOnboardingStore((s) => s.setWeekPlan);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const startedAt = Date.now();
    const answers = useOnboardingStore.getState();

    void (async () => {
      try {
        const plan = await runOnboardingGenerate(answers);
        setWeekPlan(plan);
      } catch {
        // runOnboardingGenerate already falls back locally; keep UX moving
      } finally {
        const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
        setTimeout(() => {
          router.replace("/(onboarding)/week-reveal");
        }, wait);
      }
    })();
  }, [setWeekPlan]);

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
          transition={{ type: "timing", duration: MIN_MS }}
          className="h-1 self-stretch rounded-full bg-primary-fixed"
        />
      </View>
    </OnboardingShell>
  );
};

export default GeneratingScreen;
