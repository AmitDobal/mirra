import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { selectLoggedKcal, useFuelStore } from "@/features/fuel/fuel-store";
import {
  selectHasOpenPlannedMeal,
  useMealPlanStore,
} from "@/features/fuel/meal-plan-store";
import { useWorkoutStore } from "@/features/workout/workout-store";
import { type DailyGoal, type NextAction } from "@/lib/api";
import { kcalStatus } from "@/lib/accountability";
import { useAttendanceStore } from "./attendance-store";
import { adjustedMinutes, useTodayAdjustStore } from "@/features/checkin/adjust-store";
import { openCheckIn } from "@/features/checkin/open-check-in";
import { GoalChecklist } from "./GoalChecklist";
import { HeroNextCard } from "./HeroNextCard";
import { MacroStrip } from "./MacroStrip";
import { ExerciseTeaserRow } from "./ExerciseTeaserRow";
import { TwinTargetCards } from "./TwinTargetCards";
import { FuelPhotoRow } from "./FuelPhotoRow";
import { TodayActionsPending } from "./TodayActionsPending";
import { TodayBrief } from "./TodayBrief";
import { resolveGoalRoute } from "./goal-routes";
import { useDayHistory } from "./use-day-history";
import { useTodayActions } from "./use-today-actions";
import { useVoiceCueOnFocus } from "./use-voice-cue";
import { useTodayInsights } from "./use-today-insights";
import { useRoutineEdit } from "./use-routine-edit";
import { TodayHeader } from "./TodayHeader";
import { TodayHeroCard } from "./TodayHeroCard";
import { WeeklyMirrorChip } from "./WeeklyMirrorChip";
import { WeekStripCard } from "./WeekStripCard";
import { useTodayStore } from "./today-store";
import { localTodayIso } from "@/lib/datetime";
import { sx } from "@/theme/sx";

/**
 * S15c Today home, Focus-first: compact week → Focus hero → twin targets → routine teaser
 * (→ Exercise tab) → fuel row → weekly mirror. Check-in is a small header pill when due.
 */
export const TodayScreen = () => {
  const workout = useTodayStore((s) => s.workout);
  const weekDays = useTodayStore((s) => s.weekDays);
  const dayIndex = useTodayStore((s) => s.dayIndex);
  const checkInDue = useTodayStore((s) => s.checkInDue);
  const notice = useTodayStore((s) => s.notice);
  const kcalTarget = useTodayStore((s) => s.kcalTarget);
  const hydrate = useTodayStore((s) => s.hydrate);
  const swapDay = useTodayStore((s) => s.swapDay);
  const shiftWeek = useTodayStore((s) => s.shiftWeek);
  const selectDay = useTodayStore((s) => s.selectDay);
  const setNotice = useTodayStore((s) => s.setNotice);
  const meals = useFuelStore((s) => s.meals);
  const target = useFuelStore((s) => s.target);
  const proteinTarget = useFuelStore((s) => s.proteinTarget);
  const adjustment = useTodayAdjustStore((s) => s.adjustment);
  const hydrateFuel = useFuelStore((s) => s.hydrate);
  const hydratePlan = useMealPlanStore((s) => s.hydrate);
  const ensureAfterOnboarding = useMealPlanStore((s) => s.ensureAfterOnboarding);
  const hasOpenPlannedMeal = useMealPlanStore(selectHasOpenPlannedMeal);
  const startWorkout = useWorkoutStore((s) => s.start);
  const { actions, failed: actionsFailed, refetch: refetchActions } = useTodayActions();
  useVoiceCueOnFocus();
  const { insights, load: loadInsights } = useTodayInsights();
  const [refreshing, setRefreshing] = useState(false);

  const attendance = useAttendanceStore((s) => s.byDate);
  const loadAttendance = useAttendanceStore((s) => s.load);
  const serverToday = useAttendanceStore((s) => s.today);
  const todayDate = serverToday ?? localTodayIso();
  const weekDates = useMemo(() => weekDays.map((d) => d.date), [weekDays]);
  const { onSelectDay, sheet: dayHistorySheet } = useDayHistory(
    weekDates,
    todayDate,
    selectDay,
  );

  const reload = useCallback(
    async (force = false) => {
      await Promise.all([hydrate(), hydrateFuel(), hydratePlan(), refetchActions()]);
      void ensureAfterOnboarding();
      void loadAttendance(useTodayStore.getState().weekDays[0]?.date);
      await loadInsights(force);
    },
    [
      hydrate,
      hydrateFuel,
      hydratePlan,
      ensureAfterOnboarding,
      refetchActions,
      loadAttendance,
      loadInsights,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true).finally(() => setRefreshing(false));
  }, [reload]);

  const logged = selectLoggedKcal(meals);
  const fuelTarget = target || kcalTarget || 0;
  const kcal = kcalStatus(logged, fuelTarget);
  const title = workout?.title ?? "Rest / recovery";
  const activeDay = weekDays[dayIndex];

  const minutes = adjustedMinutes(adjustment, activeDay?.date ?? todayDate, workout?.durationMin ?? 0);
  const totalSets = (workout?.exercises ?? []).reduce((n, e) => n + e.targetSets, 0);

  const routineEdit = useRoutineEdit(workout, hydrate, setNotice);

  const handleStart = () => {
    void startWorkout(workout).then(() => router.push("/workout/live"));
  };

  const handleOpenRoute = (ctaRoute: string) => {
    const target = resolveGoalRoute(ctaRoute, hasOpenPlannedMeal);
    if (target.kind === "workout") return handleStart();
    router.push(target.href);
  };
  const handleHeroPress = (next: NextAction) => handleOpenRoute(next.ctaRoute);
  const handleGoalPress = (goal: DailyGoal) => handleOpenRoute(goal.ctaRoute);

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <TodayHeader
        onBell={() => setNotice(checkInDue ? "Check-in due" : "You're caught up")}
        checkInDue={checkInDue}
        onCheckIn={openCheckIn}
      />

      {notice ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => useTodayStore.getState().clearNotice()}
          style={sx("mb-space-sm rounded-full bg-primary-fixed/20 px-3 py-1.5")}
        >
          <CapsLabel tone="lime">{notice}</CapsLabel>
        </Pressable>
      ) : null}

      <WeekStripCard
        weekDays={weekDays}
        dayIndex={dayIndex}
        attendance={attendance}
        today={todayDate}
        onPrev={() => shiftWeek(-1)}
        onNext={() => shiftWeek(1)}
        onSelectDay={onSelectDay}
      />
      {dayHistorySheet}

      <TodayHeroCard
        title={title}
        focus={workout?.focus ?? (workout ? `${workout.exercises.length} exercises` : null)}
        minutes={minutes}
        hasWorkout={Boolean(workout)}
        onStart={handleStart}
        onSwap={swapDay}
      />

      <TwinTargetCards
        focus={workout?.focus ?? null}
        minutes={minutes}
        totalSets={totalSets}
        workoutDone={totalSets > 0 && activeDay ? attendance[activeDay.date] === "active" : false}
        fuelTarget={fuelTarget}
        proteinTarget={proteinTarget}
        fuelPct={kcal.pct}
      />

      <ExerciseTeaserRow
        exercises={workout?.exercises ?? []}
        onLongPressExercise={routineEdit.openActions}
      />
      {routineEdit.sheet}

      <FuelPhotoRow
        logged={logged}
        target={fuelTarget}
        left={kcal.left}
        over={kcal.over}
        overBy={kcal.overBy}
        onLog={() => router.push("/(tabs)/log-meal")}
      />

      <View style={sx("mt-space-sm")}>
        <WeeklyMirrorChip todayDate={todayDate} />
      </View>

      {actions ? (
        <View style={sx("mt-space-md gap-space-sm")}>
          <HeroNextCard next={actions.next} scenario={actions.scenario} onPress={handleHeroPress} />
          <GoalChecklist goals={actions.goals} onPress={handleGoalPress} />
          <MacroStrip macros={actions.macros} />
        </View>
      ) : (
        <View style={sx("mt-space-md")}>
          <TodayActionsPending failed={actionsFailed} onRetry={() => void refetchActions()} />
          {insights ? <TodayBrief insights={insights} /> : null}
        </View>
      )}
    </ScreenScroll>
  );
};
