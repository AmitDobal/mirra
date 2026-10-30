import { router } from "expo-router";
import { Bell, ChevronLeft, ChevronRight, Footprints, Play, Plus, Zap } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { selectLoggedKcal, useFuelStore } from "@/features/fuel/fuel-store";
import { useWorkoutStore } from "@/features/workout/workout-store";

import { useTodayStore } from "./today-store";

/** S15 Today home — SQLite plan + fuel. */
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
  const setNotice = useTodayStore((s) => s.setNotice);
  const meals = useFuelStore((s) => s.meals);
  const target = useFuelStore((s) => s.target);
  const hydrateFuel = useFuelStore((s) => s.hydrate);
  const startWorkout = useWorkoutStore((s) => s.start);

  useEffect(() => {
    void hydrate();
    void hydrateFuel();
  }, [hydrate, hydrateFuel]);

  const logged = selectLoggedKcal(meals);
  const fuelTarget = target || kcalTarget || 0;
  const remaining = Math.max(0, fuelTarget - logged);
  const title = workout?.title ?? "Rest / recovery";
  const duration = workout?.durationMin ?? 0;
  const moves = workout?.exercises.length ?? 0;
  const detail =
    workout?.exercises.map((e) => e.name).slice(0, 4).join(", ") ||
    "No lifts scheduled for this day";
  const activeDay = weekDays[dayIndex];
  const strip =
    weekDays.length > 0
      ? weekDays.slice(0, 7).map((d, i) => ({
          d: Number(d.date.slice(-2)) || i + 1,
          active: i === dayIndex % 7,
        }))
      : Array.from({ length: 7 }, (_, i) => ({
          d: new Date().getDate() - 3 + i,
          active: i === 3,
        }));

  const handleStart = () => {
    void startWorkout(workout).then(() => router.push("/workout/live"));
  };

  return (
    <ScreenScroll>
      <View className="mb-space-lg flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm">
          <View className="h-2.5 w-2.5 rounded-full bg-primary-fixed" />
          <Text className="font-headline-semi text-headline-sm uppercase text-on-surface">
            Today
          </Text>
        </View>
        <View className="flex-row gap-space-sm">
          <IconBtn
            label="Notifications"
            Icon={Bell}
            onPress={() => setNotice(checkInDue ? "Check-in due" : "You're caught up")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push("/(tabs)/you")}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
          >
            <Text className="font-label-bold text-label-md text-primary-fixed">A</Text>
          </Pressable>
        </View>
      </View>

      {notice ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => useTodayStore.getState().clearNotice()}
          className="mb-space-sm rounded-full bg-primary-fixed/20 px-3 py-1.5"
        >
          <CapsLabel tone="lime">{notice}</CapsLabel>
        </Pressable>
      ) : null}

      {checkInDue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open check-in"
          onPress={() => router.push("/(tabs)/coach")}
          className="mb-space-md self-start rounded-full bg-primary-fixed px-3 py-1.5"
        >
          <CapsLabel tone="dark">Check-in</CapsLabel>
        </Pressable>
      ) : null}

      <View className="mb-space-md rounded-lg bg-surface-container-low p-space-md">
        <View className="mb-space-sm flex-row items-center justify-between">
          <View>
            <CapsLabel>{activeDay?.label ?? activeDay?.kind ?? "This week"}</CapsLabel>
            <Text className="font-headline-sm text-headline-sm text-on-surface">
              {activeDay?.date ?? new Date().toISOString().slice(0, 10)}
            </Text>
          </View>
          <View className="flex-row gap-1 rounded-full bg-surface-container-high p-1">
            <IconBtn label="Previous week" Icon={ChevronLeft} small onPress={() => shiftWeek(-1)} />
            <IconBtn label="Next week" Icon={ChevronRight} small onPress={() => shiftWeek(1)} />
          </View>
        </View>
        <View className="flex-row justify-between">
          {strip.map((day) => (
            <View
              key={`${day.d}-${day.active}`}
              className={`h-9 w-9 items-center justify-center rounded-full ${
                day.active ? "bg-primary-fixed" : ""
              }`}
            >
              <Text
                className={`font-headline-sm text-headline-sm ${
                  day.active ? "text-on-primary-fixed" : "text-on-surface-variant"
                }`}
              >
                {day.d}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-space-md min-h-[148px] flex-row items-center justify-between overflow-hidden rounded-lg bg-primary-fixed p-space-lg">
        <View className="max-w-[62%] flex-col">
          <View className="mb-1.5 w-fit flex-row items-center gap-1 rounded-full bg-on-primary-fixed/10 px-2.5 py-0.5">
            <Zap size={14} color={color.onPrimaryFixed} />
            <CapsLabel tone="dark">Today&apos;s Focus</CapsLabel>
          </View>
          <Text className="font-headline text-headline-lg leading-tight text-on-primary-fixed">
            {title}
          </Text>
          <Text className="mt-1 font-body-medium text-body-sm text-on-primary-fixed/85">
            {workout?.focus ?? "Recovery focus"}
          </Text>
        </View>
        <View className="h-28 w-28 items-end justify-end overflow-hidden rounded-full bg-on-primary-fixed/10">
          <Footprints size={48} color={color.onPrimaryFixed} style={{ opacity: 0.35, margin: 24 }} />
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="min-h-[148px] flex-1 justify-between rounded-lg bg-secondary p-space-md">
          <CapsLabel tone="dark">Fuel target</CapsLabel>
          <View>
            <Text className="font-display text-display-metric text-on-secondary-fixed">
              {fuelTarget || "—"}
            </Text>
            <Text className="font-body text-body-sm text-on-secondary-fixed">kcal / day</Text>
          </View>
        </View>
        <View className="min-h-[148px] flex-1 justify-between rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Logged</CapsLabel>
          <Text className="font-headline text-headline-md text-on-surface">
            {moves} moves
          </Text>
          <Text className="font-display text-display-metric text-primary-fixed">
            {fuelTarget ? Math.min(100, Math.round((logged / fuelTarget) * 100)) : 0}%
          </Text>
          <Text className="font-display text-headline-md text-on-surface">{logged}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">Logged kcal</Text>
        </View>
      </View>

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-high">
        <View className="p-space-md">
          <View className="mb-space-sm flex-row items-center justify-between">
            <CapsLabel>Today&apos;s Routine</CapsLabel>
            <Text className="font-body text-body-sm text-on-surface-variant">
              {duration} mins · {moves} movements
            </Text>
          </View>
          <Text className="font-headline-sm text-headline-sm text-on-surface">{title}</Text>
          <Text className="mt-1 font-body text-body-md text-on-surface-variant">{detail}</Text>
        </View>
        <View className="flex-row gap-space-sm px-space-md pb-space-md">
          <LimeCta
            label="Start Workout"
            onPress={handleStart}
            className="flex-1"
            icon={<Play size={18} color={color.onPrimaryFixed} fill={color.onPrimaryFixed} />}
          />
          <LimeCta label="Swap" onPress={swapDay} variant="dark" className="px-space-md" />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log meal"
        onPress={() => router.push("/(tabs)/log-meal")}
        className="flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md"
      >
        <View>
          <Text className="font-headline-sm text-headline-sm text-on-surface">
            {logged} / {fuelTarget || "—"}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">
            Calories logged · {remaining} kcal remaining
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
          <Plus size={20} color={color.onSurface} />
        </View>
      </Pressable>
    </ScreenScroll>
  );
};

const IconBtn = ({
  label,
  Icon,
  small,
  onPress,
}: {
  label: string;
  Icon: typeof Bell;
  small?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className={`items-center justify-center rounded-full ${small ? "h-8 w-8" : "h-11 w-11"}`}
  >
    <Icon size={small ? 18 : 22} color={color.onSurface} />
  </Pressable>
);
