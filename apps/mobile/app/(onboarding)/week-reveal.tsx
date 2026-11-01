import { router } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { s12WeekReveal } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  useOnboardingStore,
} from "@/features/onboarding";
import {
  WeekRevealDayStrip,
  WeekRevealHero,
  WeekRevealWorkoutCard,
  splitTitleFromWorkouts,
} from "@/features/onboarding/components/WeekRevealParts";
import { loadWeekPlanFromDb } from "@/features/onboarding/services/plan-persist";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import { getCurrentPlan, type CurrentPlan, type PlanWorkout } from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";
import { color } from "@/theme/tokens";
import { Button } from "@/ui";
import { sx } from "@/theme/sx";

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

const dayTag = (kind: string, hasWorkout: boolean) => {
  if (kind === "lift" || hasWorkout) return "Lift";
  if (kind === "fuel") return "Fuel";
  return "Rest";
};

const toOnboardingWorkout = (
  w: PlanWorkout,
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

const fromApiPlan = (raw: CurrentPlan): OnboardingWeekPlan => {
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

/** S12 — Stitch week reveal + expandable exercises. */
const WeekRevealScreen = () => {
  const c = onboardingCopy.weekReveal;
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const storePlan = useOnboardingStore((s) => s.weekPlan);
  const planStore = usePlanStore((s) => s.plan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const [extra, setExtra] = useState<OnboardingWeekPlan | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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

  const dayStats = useMemo(() => {
    const days = plan?.days ?? [];
    if (!days.length) {
      const lifts = trainingDays.filter(Boolean).length;
      return {
        workouts: lifts || 3,
        rest: Math.max(0, 7 - lifts - 1),
        recovery: lifts ? 1 : 0,
      };
    }
    let workouts = 0;
    let rest = 0;
    let recovery = 0;
    for (const d of days) {
      const lift = d.kind === "lift" || Boolean(d.workout);
      if (lift) workouts += 1;
      else if (d.kind === "fuel") recovery += 1;
      else rest += 1;
    }
    return { workouts, rest, recovery };
  }, [plan?.days, trainingDays]);

  const kcal = plan?.summary?.kcalTarget;
  const splitTitle = splitTitleFromWorkouts(
    plan?.workouts ?? [],
    c.heroSplit,
  );
  const readinessPct = Math.round((dayStats.workouts / 7) * 100);
  const outcome = plan?.summary?.outcomeLine;

  const strip =
    plan?.days.length === 7
      ? plan.days.map((d, i) => {
          const lift = d.kind === "lift" || Boolean(d.workout);
          return {
            letter: DAY_LETTERS[i]!,
            num: Number(d.date.slice(-2)) || i + 1,
            tag: dayTag(d.kind, Boolean(d.workout)),
            lift,
          };
        })
      : c.days.map((d, i) => ({
          letter: d.letter,
          num: 16 + i,
          tag: d.tag,
          lift: d.tag === "Lift",
        }));

  const workouts =
    plan?.workouts.length
      ? plan.workouts.map((w, i) => {
          const day = plan.days.find((d) => d.workout?.id === w.id);
          const dayNum = day ? day.dayIndex + 1 : i + 1;
          const focusRaw = w.focus?.trim() || "";
          const fromTitle = w.title
            .replace(/\s+(day|workout|strength|session)$/i, "")
            .trim();
          const dayFocus =
            focusRaw && focusRaw.toLowerCase() !== "session"
              ? focusRaw
              : fromTitle || "Session";
          // Stitch-style second chip: keep short; avoid duplicating the title
          const focusTag =
            focusRaw && focusRaw.toLowerCase() !== "session"
              ? focusRaw
              : fromTitle.split(/\s+/).slice(0, 2).join(" ") || "Training";
          return {
            id: w.id,
            name: w.title,
            mins: `${w.durationMin} min`,
            focusTag,
            exerciseCount: w.exercises.length,
            dayLabel: `Day ${String(dayNum).padStart(2, "0")} · ${dayFocus.toUpperCase()}`,
            exercises: w.exercises,
          };
        })
      : c.workouts.map((w, i) => ({
          id: `fallback-${i}`,
          name: w.name,
          mins: w.mins,
          focusTag: w.meta.split("·")[0]?.trim() || "Session",
          exerciseCount: Number.parseInt(w.meta, 10) || 0,
          dayLabel: `Day ${String(i + 1).padStart(2, "0")}`,
          exercises: [] as {
            name: string;
            targetSets: number;
            targetReps: string;
          }[],
        }));

  return (
    <OnboardingShell
      footer={
        <>
          <Button label={c.start} onPress={() => router.push("/(onboarding)/paywall")} />
          <Button
            label={c.edit}
            variant="ghost"
            onPress={() => router.replace("/(onboarding)/goal")}
          />
        </>
      }
    >
      <Text style={sx("font-headline text-headline-md text-on-surface")}>{c.title}</Text>
      <Text style={[sx("font-body text-body-md text-on-surface-variant"), { marginTop: 2 }]}>
        {goalLabel(goal)} · {dayStats.workouts} days / week
      </Text>

      <View style={sx("mt-space-lg")}>
        <WeekRevealHero
          title={splitTitle}
          kcal={kcal}
          fallbackKcal={c.kcal}
          workoutCount={dayStats.workouts}
          restCount={dayStats.rest}
          recoveryCount={dayStats.recovery}
          readinessPct={readinessPct}
        />
      </View>

      <View style={sx("mt-space-lg")}>
        <WeekRevealDayStrip days={strip} />
      </View>

      <View style={sx("mt-space-lg mb-space-sm flex-row items-center justify-between")}>
        <Text style={sx("font-label text-label-lg uppercase text-on-surface")}>
          Target Routine
        </Text>
        <Text style={sx("font-label text-label-md text-secondary")}>
          {workouts.length} of {dayStats.workouts || workouts.length} planned
        </Text>
      </View>
      <Text style={sx("mb-space-sm font-body text-body-sm text-on-surface-variant")}>
        Tap a session to see exercises
      </Text>
      <View style={{ gap: 14 }}>
        {workouts.map((w, i) => (
          <WeekRevealWorkoutCard
            key={w.id}
            name={w.name}
            mins={w.mins}
            focusTag={w.focusTag}
            exerciseCount={w.exerciseCount}
            dayLabel={w.dayLabel}
            image={WORKOUT_IMGS[i % WORKOUT_IMGS.length]!}
            exercises={w.exercises}
            featured={i === 0}
            expanded={openId === w.id}
            onToggle={() => setOpenId((cur) => (cur === w.id ? null : w.id))}
          />
        ))}
      </View>

      {outcome ? (
        <View style={sx("mt-space-lg mb-space-sm flex-row items-center justify-center gap-2")}>
          <TrendingUp size={18} color={color.primaryContainer} />
          <Text
            numberOfLines={2}
            style={[
              sx("text-center font-body-medium text-body-md text-on-surface-variant"),
              { flexShrink: 1 },
            ]}
          >
            {outcome}
          </Text>
        </View>
      ) : null}
    </OnboardingShell>
  );
};

export default WeekRevealScreen;
