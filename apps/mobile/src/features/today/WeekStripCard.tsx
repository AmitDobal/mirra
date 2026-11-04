import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { AttendanceState, PlanDay } from "@/lib/api";
import { localTodayIso } from "@/lib/datetime";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { useAttendanceStore } from "./attendance-store";
import { DayMarker } from "./DayMarker";
import { TodayIconBtn } from "./TodayIconBtn";
import { buildStrip, markerFor, mondayOf, type DayMarker as Marker } from "./week-strip-model";

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long" };

/** Presence never shows for future days; "none" shows nothing (no guilt styling). */
export const presenceFor = (
  date: string | undefined,
  today: string,
  attendance: Readonly<Record<string, AttendanceState>>,
): AttendanceState =>
  date && date <= today ? (attendance[date] ?? "none") : "none";

const dayLabel = (date: string, dayNum: number, marker: Marker) => {
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", WEEKDAY_FORMAT);
  const base = `${weekday} ${dayNum}`;
  if (marker === "flame") return `${base}, workout done`;
  return marker === "dot" ? `${base}, you were here` : base;
};

type Props = {
  readonly weekDays: readonly PlanDay[];
  readonly dayIndex: number;
  /** Presence by date from `attendance-store`; markers fade in once loaded. */
  readonly attendance?: Readonly<Record<string, AttendanceState>>;
  /** Local today (`YYYY-MM-DD`); later days never get a marker. */
  readonly today?: string;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelectDay: (index: number) => void;
};

/** S15c compact week strip (S42 markers): flame = workout done, muted dot = presence only. */
export const WeekStripCard = ({
  weekDays,
  dayIndex,
  attendance = {},
  today = localTodayIso(),
  onPrev,
  onNext,
  onSelectDay,
}: Props) => {
  const workoutByDate = useAttendanceStore((s) => s.workoutByDate);
  const loadAttendance = useAttendanceStore((s) => s.load);
  const planDates = useMemo(() => weekDays.map((d) => d.date), [weekDays]);
  const strip = useMemo(() => buildStrip(planDates, dayIndex, today), [planDates, dayIndex, today]);
  const noPlan = planDates.length === 0;

  // No plan yet: the screen only loads presence for plan weeks, so fetch the real week here.
  useEffect(() => {
    if (noPlan) void loadAttendance(mondayOf(today));
  }, [noPlan, loadAttendance, today]);

  return (
    <View style={sx("mb-space-sm flex-row items-center rounded-full bg-surface-container-low px-1 py-1")}>
      <TodayIconBtn label="Previous day" Icon={ChevronLeft} small onPress={onPrev} />
      <View style={sx("flex-1 flex-row justify-between")}>
        {strip.map((day) => {
          const marker = markerFor(day.date, today, attendance, workoutByDate);
          const ring = day.isToday && !day.selected;
          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={dayLabel(day.date, day.dayNum, marker)}
              accessibilityState={{ selected: day.selected }}
              onPress={() => onSelectDay(day.index)}
              style={sx("items-center")}
            >
              <Text
                style={sx(
                  `font-label text-label-caps ${day.selected ? "text-primary-fixed" : "text-on-surface-variant"}`,
                )}
              >
                {day.letter}
              </Text>
              <View
                style={[
                  styles.circle,
                  day.selected ? styles.selected : null,
                  ring ? styles.todayRing : null,
                ]}
              >
                <Text
                  style={sx(
                    `font-headline-sm text-label-md ${
                      day.selected ? "text-on-primary-fixed" : ring ? "text-primary-fixed" : "text-on-surface"
                    }`,
                  )}
                >
                  {day.dayNum}
                </Text>
              </View>
              <DayMarker marker={marker} />
            </Pressable>
          );
        })}
      </View>
      <TodayIconBtn label="Next day" Icon={ChevronRight} small onPress={onNext} />
    </View>
  );
};

const CIRCLE = 32;

/**
 * Explicit radius (not `rounded-full` 9999) + no iOS shadow props on Android:
 * Android QA saw the selected past day drawn as a square.
 */
const styles = StyleSheet.create({
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: {
    backgroundColor: color.primaryFixed,
    ...Platform.select({
      ios: {
        shadowColor: color.primaryFixed,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  todayRing: {
    borderWidth: 1.5,
    borderColor: color.primaryFixed,
  },
});
