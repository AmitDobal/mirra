import { router, useFocusEffect } from "expo-router";
import { Bell, Zap } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { s15Today } from "../../../assets/stitch";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { selectLoggedKcal, useFuelStore } from "@/features/fuel/fuel-store";
import {
  selectHasOpenPlannedMeal,
  useMealPlanStore,
} from "@/features/fuel/meal-plan-store";
import { useWorkoutStore } from "@/features/workout/workout-store";
import { type DailyGoal, type NextAction } from "@/lib/api";
import { kcalStatus } from "@/lib/accountability";
import { useAttendanceStore } from "./attendance-store";
import { GoalChecklist } from "./GoalChecklist";
import { HeroNextCard } from "./HeroNextCard";
import { KcalDonut } from "./KcalDonut";
import { MacroStrip } from "./MacroStrip";
import { FuelLogStrip, RoutineCard } from "./RoutineCard";
import { TodayActionsPending } from "./TodayActionsPending";
import { TodayBrief } from "./TodayBrief";
import { resolveGoalRoute } from "./goal-routes";
import { useDayHistory } from "./use-day-history";
import { useTodayActions } from "./use-today-actions";
import { useVoiceCueOnFocus } from "./use-voice-cue";
import { useTodayInsights } from "./use-today-insights";
import { useRoutineEdit } from "./use-routine-edit";
import { TodayIconBtn } from "./TodayIconBtn";
import { WeekStripCard } from "./WeekStripCard";
import { useTodayStore } from "./today-store";
import { sx } from "@/theme/sx";

/**
 * S15 Today home — local polish (brief / hero / goals / routine edit / voice)
 * plus main attendance (PresenceDot week strip + DayHistorySheet).
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
  const hydrateFuel = useFuelStore((s) => s.hydrate);
  const hydratePlan = useMealPlanStore((s) => s.hydrate);
  const hasOpenPlannedMeal = useMealPlanStore(selectHasOpenPlannedMeal);
  const startWorkout = useWorkoutStore((s) => s.start);
  const openExercise = useWorkoutStore((s) => s.openExercise);
  const { actions, failed: actionsFailed, refetch: refetchActions } = useTodayActions();
  useVoiceCueOnFocus();
  const { insights, load: loadInsights } = useTodayInsights();
  const [refreshing, setRefreshing] = useState(false);

  const attendance = useAttendanceStore((s) => s.byDate);
  const loadAttendance = useAttendanceStore((s) => s.load);
  const serverToday = useAttendanceStore((s) => s.today);
  const todayDate = serverToday ?? new Date().toISOString().slice(0, 10);
  const weekDates = useMemo(() => weekDays.map((d) => d.date), [weekDays]);
  const { onSelectDay, sheet: dayHistorySheet } = useDayHistory(
    weekDates,
    todayDate,
    selectDay,
  );

  const reload = useCallback(
    async (force = false) => {
      await Promise.all([hydrate(), hydrateFuel(), hydratePlan(), refetchActions()]);
      void loadAttendance(useTodayStore.getState().weekDays[0]?.date);
      await loadInsights(force);
    },
    [hydrate, hydrateFuel, hydratePlan, refetchActions, loadAttendance, loadInsights],
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

  const monthLabel = useMemo(() => {
    const iso = activeDay?.date ?? new Date().toISOString().slice(0, 10);
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [activeDay?.date]);

  const weekLabel = useMemo(() => {
    const label = activeDay?.label ?? activeDay?.kind;
    return label ? `Week · ${label}` : "This week";
  }, [activeDay?.kind, activeDay?.label]);

  const routineEdit = useRoutineEdit(workout, hydrate, setNotice);

  const handleStart = () => {
    void startWorkout(workout).then(() => router.push("/workout/live"));
  };

  const handleOpenExercise = (exerciseId: string) =>
    void openExercise(workout, exerciseId).then(() => router.push("/workout/live"));

  const handleOpenRoute = (ctaRoute: string) => {
    const target = resolveGoalRoute(ctaRoute, hasOpenPlannedMeal);
    if (target.kind === "workout") return handleStart();
    router.push(target.href);
  };
  const handleHeroPress = (next: NextAction) => handleOpenRoute(next.ctaRoute);
  const handleGoalPress = (goal: DailyGoal) => handleOpenRoute(goal.ctaRoute);

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-lg flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <View style={sx("h-2.5 w-2.5 rounded-full bg-primary-fixed")} />
          <Text style={sx("font-headline-semi text-headline-sm uppercase text-on-surface")}>
            Today
          </Text>
        </View>
        <View style={sx("flex-row gap-space-sm")}>
          <TodayIconBtn
            label="Notifications"
            Icon={Bell}
            onPress={() => setNotice(checkInDue ? "Check-in due" : "You're caught up")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/(tabs)/you")}
            style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
          >
            <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>A</Text>
          </Pressable>
        </View>
      </View>

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
        weekLabel={weekLabel}
        monthLabel={monthLabel}
        attendance={attendance}
        today={todayDate}
        onPrev={() => shiftWeek(-1)}
        onNext={() => shiftWeek(1)}
        onSelectDay={onSelectDay}
      />
      {dayHistorySheet}

      <View
        style={sx(
          "mb-space-md min-h-[148px] flex-row items-center justify-between overflow-hidden rounded-lg bg-primary-fixed p-space-lg",
        )}
      >
        <View style={sx("max-w-[62%] flex-1 flex-col gap-space-sm")}>
          <View
            style={sx(
              "self-start flex-row items-center gap-1 rounded-full bg-on-primary-fixed/10 px-2.5 py-1",
            )}
          >
            <Zap size={14} color={color.onPrimaryFixed} />
            <CapsLabel tone="dark">Today&apos;s Focus</CapsLabel>
          </View>
          <Text
            style={sx("font-headline text-headline-lg text-on-primary-fixed")}
            numberOfLines={3}
          >
            {title}
          </Text>
          <Text style={sx("font-body-medium text-body-sm text-on-primary-fixed/85")}>
            {workout?.focus ?? "Recovery focus"}
          </Text>
          {checkInDue ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open check-in"
              onPress={() => router.push("/(tabs)/coach")}
              style={sx(
                "mt-0.5 self-start flex-row items-center gap-1 rounded-full bg-on-primary-fixed/12 px-2 py-0.5",
              )}
            >
              <AiBadge label={false} tone="dark" size={12} />
              <CapsLabel tone="dark">Check-in</CapsLabel>
            </Pressable>
          ) : null}
        </View>
        <Image
          source={s15Today.athleteMidMotion}
          accessibilityLabel="Today focus"
          style={{ width: 112, height: 112, borderRadius: 56 }}
          resizeMode="cover"
        />
      </View>

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <View style={sx("min-h-[148px] flex-1 justify-between rounded-lg bg-secondary p-space-md")}>
          <CapsLabel tone="dark">Fuel target</CapsLabel>
          <View>
            <Text style={sx("font-display text-display-metric text-on-secondary-fixed")}>
              {fuelTarget || "—"}
            </Text>
            <Text style={sx("font-body text-body-sm text-on-secondary-fixed")}>kcal / day</Text>
          </View>
        </View>
        <View
          style={sx(
            "min-h-[148px] flex-1 justify-between rounded-lg bg-surface-container-high p-space-md",
          )}
        >
          <View style={sx("flex-row items-center justify-between")}>
            <CapsLabel>Logged</CapsLabel>
            <View style={sx("rounded-full bg-surface-container-highest px-2 py-0.5")}>
              <CapsLabel tone="lime">Target</CapsLabel>
            </View>
          </View>
          <View style={sx("flex-row items-center gap-space-sm")}>
            <KcalDonut pct={kcal.pct} />
            <View>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
                {logged}
              </Text>
              <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
                Active kcal
              </Text>
            </View>
          </View>
          <View style={sx("flex-row items-center gap-2")}>
            <View style={sx("h-2 w-2 rounded-full bg-primary-fixed")} />
            <CapsLabel>Calorie target</CapsLabel>
          </View>
        </View>
      </View>

      <RoutineCard
        workout={workout}
        onStart={handleStart}
        onSwap={swapDay}
        onOpenExercise={handleOpenExercise}
        onAskCoach={() => router.push("/(tabs)/plan-chat")}
        onLongPressExercise={routineEdit.openActions}
        onAddExercise={routineEdit.openAdd}
      />
      {routineEdit.sheet}

      <FuelLogStrip
        logged={logged}
        target={fuelTarget}
        left={kcal.left}
        over={kcal.over}
        overBy={kcal.overBy}
        onLog={() => router.push("/(tabs)/log-meal")}
      />

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
