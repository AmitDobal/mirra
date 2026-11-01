import { router, useFocusEffect } from "expo-router";
import { CalendarDays, Search } from "lucide-react-native";
import { useCallback, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WeekStripCard } from "@/features/today/WeekStripCard";
import { useTodayStore } from "@/features/today/today-store";
import { localTodayIso } from "@/lib/datetime";
import { useWorkoutStore } from "@/features/workout/workout-store";
import { color, font, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { openExerciseDetail } from "./exercise-routes";
import { LibrarySection } from "./LibrarySection";
import { ProtocolList } from "./ProtocolList";
import { SessionHero } from "./SessionHero";
import { useExerciseSheet } from "./use-exercise-sheet";
import { useNotice } from "./use-notice";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** S25 Exercise hub — today's session, protocol list, searchable library. */
export const ExerciseScreen = () => {
  const workout = useTodayStore((s) => s.workout);
  const dayIndex = useTodayStore((s) => s.dayIndex);
  const todayIndex = useTodayStore((s) => s.todayIndex);
  const weekDays = useTodayStore((s) => s.weekDays);
  const hydrate = useTodayStore((s) => s.hydrate);
  const selectDay = useTodayStore((s) => s.selectDay);
  const shiftWeek = useTodayStore((s) => s.shiftWeek);
  const startWorkout = useWorkoutStore((s) => s.start);
  const { notice, show } = useNotice();
  const { openAdd, sheet } = useExerciseSheet(workout, show);

  // Same source as Today: re-hydrate the AI week plan on every focus, keeping the picked day.
  const handleRefresh = useCallback(() => hydrate({ keepSelection: true }), [hydrate]);
  useFocusEffect(
    useCallback(() => {
      void hydrate({ keepSelection: true });
    }, [hydrate]),
  );

  const handleStart = () => {
    void startWorkout(workout).then(() => router.push("/workout/live"));
  };

  const exercises = workout?.exercises ?? [];
  const hasWeek = weekDays.length > 0;
  const isToday = !hasWeek || dayIndex === todayIndex;
  // Weekday comes from the plan slot (Mon=0), not the UTC date string.
  const weekday = WEEKDAYS[weekDays[dayIndex]?.dayIndex ?? dayIndex] ?? "Today";

  return (
    <ScreenScroll onRefresh={handleRefresh}>
      <View style={styles.header}>
        <View style={styles.flex1}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <CapsLabel tone="lime">Exercise</CapsLabel>
          </View>
          <Text style={styles.title}>{isToday ? "Today's session" : `${weekday}'s session`}</Text>
        </View>
        <HeaderBtn label="Search exercises" onPress={openAdd}>
          <Search size={16} color={color.onSurface} />
        </HeaderBtn>
        <HeaderBtn label="Back to Today" onPress={() => router.replace("/(tabs)/today")}>
          <CalendarDays size={16} color={color.onSurface} />
        </HeaderBtn>
      </View>

      {notice ? (
        <View accessibilityLiveRegion="polite" style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {hasWeek ? (
        <WeekStripCard
          weekDays={weekDays}
          dayIndex={dayIndex}
          today={localTodayIso()}
          onPrev={() => shiftWeek(-1)}
          onNext={() => shiftWeek(1)}
          onSelectDay={selectDay}
        />
      ) : null}

      <SessionHero
        workout={workout}
        dayNumber={hasWeek ? dayIndex + 1 : null}
        isToday={isToday}
        onStart={handleStart}
      />

      {exercises.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{isToday ? "Today's Protocol" : "Protocol"}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{exercises.length} Exercises</Text>
            </View>
          </View>
          <ProtocolList
            exercises={exercises}
            onOpen={(e) => openExerciseDetail({ exerciseId: e.id })}
            onAdd={openAdd}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <LibrarySection onOpen={(e) => openExerciseDetail({ catalogId: e.id })} />
      </View>
      {sheet}
    </ScreenScroll>
  );
};

const HeaderBtn = ({
  label,
  onPress,
  children,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly children: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={styles.iconBtn}
  >
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.md },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed },
  title: { fontFamily: font.headline, fontSize: 22, lineHeight: 28, color: color.onSurface },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerHigh,
  },
  notice: {
    marginBottom: space.sm,
    borderRadius: radius.DEFAULT,
    padding: 12,
    backgroundColor: color.surfaceContainerHighest,
  },
  noticeText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.onSurface },
  section: { marginTop: space.xl },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: font.headlineSemi, fontSize: 16, color: color.onSurface },
  countPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: color.onPrimaryFixedVariant,
  },
  countText: { fontFamily: font.labelBold, fontSize: 10, color: color.primaryFixed },
});
