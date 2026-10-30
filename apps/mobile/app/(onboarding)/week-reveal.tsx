import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { loadWeekPlanFromDb } from "@/features/onboarding/services/plan-persist";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import { Button, Card } from "@/ui";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const goalLabel = (goal: string | null) => {
  const map: Record<string, string> = {
    lose_fat: "Lose fat",
    build_muscle: "Build muscle",
    recomp: "Recomp",
    consistent: "Get consistent",
    performance: "Performance",
  };
  return goal ? (map[goal] ?? "Build muscle") : "Build muscle";
};

const dayTag = (kind: string) => {
  if (kind === "lift") return "Lift";
  if (kind === "fuel") return "Fuel";
  return "Rest";
};

/** S12 — Plan days/workouts from SQLite `getCurrentPlan`. */
const WeekRevealScreen = () => {
  const c = onboardingCopy.weekReveal;
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const storePlan = useOnboardingStore((s) => s.weekPlan);
  const [dbPlan, setDbPlan] = useState<OnboardingWeekPlan | null>(null);

  useEffect(() => {
    let alive = true;
    void loadWeekPlanFromDb().then((plan) => {
      if (alive) setDbPlan(plan);
    });
    return () => {
      alive = false;
    };
  }, []);

  const plan = dbPlan ?? storePlan;

  const daysCount =
    plan?.days.filter((d) => d.kind === "lift").length ??
    trainingDays.filter(Boolean).length;

  const kcal = plan?.summary?.kcalTarget;
  const hero =
    plan?.summary?.outcomeLine ||
    plan?.workouts[0]?.title ||
    c.heroSplit;

  const strip =
    plan?.days.length === 7
      ? plan.days.map((d, i) => ({
          letter: DAY_LETTERS[i]!,
          tag: dayTag(d.kind),
          lift: d.kind === "lift",
        }))
      : c.days.map((d) => ({
          letter: d.letter,
          tag: d.tag,
          lift: d.tag === "Lift",
        }));

  const workouts =
    plan?.workouts.length
      ? plan.workouts.map((w) => ({
          name: w.title,
          mins: `${w.durationMin} min`,
          meta: `${w.exercises.length} exercises${w.focus ? ` · ${w.focus}` : ""}`,
        }))
      : c.workouts;

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
              {hero}
            </Text>
            <View className="mt-space-sm self-start rounded-full bg-on-primary-fixed/15 px-space-sm py-1">
              <Text className="font-label text-label-md text-on-primary-fixed">
                {kcal ? `~${kcal.toLocaleString()} kcal/day` : c.kcal}
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
        {strip.map((day, i) => (
          <View key={`${day.letter}-${i}`} className="items-center gap-1">
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${
                day.lift
                  ? "bg-primary-container"
                  : "bg-surface-container-high"
              }`}
            >
              <Text
                className={`font-label text-label-md ${
                  day.lift ? "text-on-primary-fixed" : "text-on-surface"
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
        {workouts.map((w) => (
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
