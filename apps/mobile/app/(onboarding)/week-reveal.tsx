import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

import { s12WeekReveal } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { loadWeekPlanFromDb } from "@/features/onboarding/services/plan-persist";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import { getCurrentPlan } from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";
import { Button, Card } from "@/ui";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const WORKOUT_IMGS = [
  s12WeekReveal.dumbbellOverheadPress,
  s12WeekReveal.barbellBentOverRow,
  s12WeekReveal.barbellBackSquat,
] as const;

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

const toOnboardingWorkout = (
  w: NonNullable<Awaited<ReturnType<typeof getCurrentPlan>>["days"][number]["workout"]>,
): OnboardingWeekPlan["workouts"][number] => ({
  id: w.id,
  title: w.title,
  durationMin: w.durationMin,
  focus: w.focus,
  exercises: w.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    cue: e.cue,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    restSec: e.restSec,
  })),
});

const fromApiPlan = (
  raw: Awaited<ReturnType<typeof getCurrentPlan>>,
): OnboardingWeekPlan => {
  const workouts = raw.days
    .map((d) => d.workout)
    .filter((w): w is NonNullable<typeof w> => w != null)
    .map(toOnboardingWorkout);
  const seen = new Set<string>();
  const unique = workouts.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
  const summary = raw.summary as OnboardingWeekPlan["summary"] | undefined;
  return {
    id: raw.id,
    version: raw.version,
    status: raw.status,
    weekStart: raw.weekStart,
    summary,
    days: raw.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind,
      label: d.label,
      workout: d.workout ? toOnboardingWorkout(d.workout) : null,
    })),
    workouts: unique,
    source: "api",
  };
};

/** S12 — Plan from store / API / SQLite. */
const WeekRevealScreen = () => {
  const c = onboardingCopy.weekReveal;
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const storePlan = useOnboardingStore((s) => s.weekPlan);
  const planStore = usePlanStore((s) => s.plan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const [extra, setExtra] = useState<OnboardingWeekPlan | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const api = await getCurrentPlan();
        if (!alive || !api?.days?.length) throw new Error("empty");
        setPlan(api);
        setExtra(fromApiPlan(api));
        return;
      } catch {
        /* fall through */
      }
      const db = await loadWeekPlanFromDb();
      if (alive) setExtra(db);
    })();
    return () => {
      alive = false;
    };
  }, [setPlan]);

  const fromStore: OnboardingWeekPlan | null = planStore
    ? fromApiPlan(planStore)
    : null;
  const plan = storePlan ?? fromStore ?? extra;

  const daysCount =
    plan?.days.filter((d) => d.kind === "lift" || d.workout).length ??
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
          lift: d.kind === "lift" || Boolean(d.workout),
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
          <Image
            source={WORKOUT_IMGS[0]}
            accessibilityLabel="Week workout"
            style={{ width: 56, height: 56, borderRadius: 28 }}
            resizeMode="cover"
          />
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
        {workouts.map((w, i) => (
          <Card key={w.name} tone="lavender" className="flex-row gap-space-md p-space-md">
            <Image
              source={WORKOUT_IMGS[i % WORKOUT_IMGS.length]!}
              accessibilityLabel={w.name}
              style={{ width: 56, height: 56, borderRadius: 8 }}
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text className="font-headline-semi text-headline-sm text-on-secondary-container">
                {w.name}
              </Text>
              <Text className="mt-1 font-body text-body-sm text-secondary">
                {w.mins} · {w.meta}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </OnboardingShell>
  );
};

export default WeekRevealScreen;
