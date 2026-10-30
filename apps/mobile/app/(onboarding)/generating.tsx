import { router } from "expo-router";
import { MotiView, type MotiTransition } from "moti";
import { useEffect, useRef } from "react";
import { Image, Text, View } from "react-native";

import { s11GeneratingWeek } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { runOnboardingGenerate } from "@/features/onboarding/services/run-generate";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import type { CurrentPlan } from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";

const MIN_MS = 1600;

const toCurrentPlan = (plan: OnboardingWeekPlan): CurrentPlan => ({
  id: plan.id,
  version: plan.version,
  status: plan.status,
  weekStart: plan.weekStart,
  summary: plan.summary as CurrentPlan["summary"],
  days: plan.days.map((d) => ({
    id: d.id,
    dayIndex: d.dayIndex,
    date: d.date,
    kind: d.kind,
    label: d.label,
    workout: d.workout ?? null,
  })),
});

/** S11 — PUT onboarding → generate plan → week-reveal. */
const GeneratingScreen = () => {
  const c = onboardingCopy.generating;
  const setWeekPlan = useOnboardingStore((s) => s.setWeekPlan);
  const setPlan = usePlanStore((s) => s.setPlan);
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
        setPlan(toCurrentPlan(plan));
      } catch {
        // runOnboardingGenerate already falls back locally; keep UX moving
      } finally {
        const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
        setTimeout(() => {
          router.replace("/(onboarding)/week-reveal");
        }, wait);
      }
    })();
  }, [setPlan, setWeekPlan]);

  return (
    <OnboardingShell scroll={false}>
      <View className="flex-1 items-center justify-center gap-space-lg">
        <View className="mb-space-md flex-row gap-space-sm">
          {[
            s11GeneratingWeek.athleteSquat,
            s11GeneratingWeek.sprinterKneeling,
            s11GeneratingWeek.athleteBarbell,
          ].map((src, i) => (
            <Image
              key={i}
              source={src}
              accessibilityLabel="Generating plan"
              style={{ width: 72, height: 96, borderRadius: 10 }}
              resizeMode="cover"
            />
          ))}
        </View>
        <View className="w-full max-w-[280px] gap-space-sm">
          {[1, 0.72, 0.9, 0.55].map((w, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0.35 }}
              animate={{ opacity: 0.9 }}
              transition={
                {
                  type: "timing",
                  duration: 900,
                  loop: true,
                  delay: i * 120,
                } as MotiTransition
              }
              style={{
                width: `${w * 100}%`,
                height: 12,
                borderRadius: 9999,
                backgroundColor: "#2a2a2a",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: "33%",
                  borderRadius: 9999,
                  backgroundColor: "rgba(203,241,80,0.4)",
                }}
              />
            </MotiView>
          ))}
        </View>
        <Text className="font-label text-label-caps text-on-surface-variant">
          {c.label}
        </Text>
        <MotiView
          from={{ width: "20%" }}
          animate={{ width: "88%" }}
          transition={{ type: "timing", duration: MIN_MS } as MotiTransition}
          style={{
            height: 4,
            alignSelf: "stretch",
            borderRadius: 9999,
            backgroundColor: "#cbf150",
          }}
        />
      </View>
    </OnboardingShell>
  );
};

export default GeneratingScreen;
