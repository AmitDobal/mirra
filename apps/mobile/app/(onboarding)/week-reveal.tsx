import { router } from "expo-router";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { Button, Card } from "@/ui";

const goalLabel = (goal: string | null) => {
  const map: Record<string, string> = {
    lose_fat: "Lose fat",
    build_muscle: "Build muscle",
    recomp: "Recomp",
    consistent: "Get consistent",
    performance: "Performance",
  };
  return goal ? map[goal] ?? "Build muscle" : "Build muscle";
};

/** S12 — Soft plan tease before paywall. */
const WeekRevealScreen = () => {
  const c = onboardingCopy.weekReveal;
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const daysCount = trainingDays.filter(Boolean).length;

  const handleStart = () => router.push("/(onboarding)/paywall");
  const handleEdit = () => router.replace("/(onboarding)/goal");

  return (
    <OnboardingShell
      footer={
        <>
          <Button label={c.start} onPress={handleStart} />
          <Button label={c.edit} variant="ghost" onPress={handleEdit} />
        </>
      }
    >
      <Text className="mt-space-md font-headline text-headline-lg text-on-surface">
        {c.title}
      </Text>
      <Text className="mt-space-xs font-body-medium text-body-md text-on-surface-variant">
        {goalLabel(goal)} · {daysCount} days / week
      </Text>

      <Card tone="lime" className="mt-space-lg p-space-md">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-space-md">
            <Text className="font-headline-semi text-headline-sm text-on-primary-fixed">
              {c.heroSplit}
            </Text>
            <View className="mt-space-sm self-start rounded-full bg-on-primary-fixed/15 px-space-sm py-1">
              <Text className="font-label text-label-md text-on-primary-fixed">
                {c.kcal}
              </Text>
            </View>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-on-primary-fixed/40">
            <Text className="font-label-bold text-label-lg text-on-primary-fixed">
              {c.progress}
            </Text>
          </View>
        </View>
      </Card>

      <View className="mt-space-lg flex-row justify-between">
        {c.days.map((day, i) => (
          <View key={`${day.letter}-${i}`} className="items-center gap-1">
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${
                day.tag === "Lift"
                  ? "bg-primary-container"
                  : "bg-surface-container-high"
              }`}
            >
              <Text
                className={`font-label text-label-md ${
                  day.tag === "Lift"
                    ? "text-on-primary-fixed"
                    : "text-on-surface"
                }`}
              >
                {day.letter}
              </Text>
            </View>
            <Text className="font-body text-body-sm text-on-surface-variant">
              {day.tag}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-space-lg gap-space-sm">
        {c.workouts.map((w) => (
          <Card key={w.name} tone="lavender" className="p-space-md">
            <Text className="font-headline-semi text-headline-sm text-on-secondary-container">
              {w.name}
            </Text>
            <Text className="mt-1 font-body text-body-sm text-secondary">
              {w.mins} · {w.meta}
            </Text>
          </Card>
        ))}
      </View>
    </OnboardingShell>
  );
};

export default WeekRevealScreen;
