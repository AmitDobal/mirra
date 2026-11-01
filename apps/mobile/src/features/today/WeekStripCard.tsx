import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { AttendanceState, PlanDay } from "@/lib/api";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { PresenceDot } from "./PresenceDot";
import { TodayIconBtn } from "./TodayIconBtn";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const WEEKDAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long" };

/** Presence never shows for future days; "none" shows nothing (no guilt styling). */
export const presenceFor = (
  date: string | undefined,
  today: string,
  attendance: Readonly<Record<string, AttendanceState>>,
): AttendanceState =>
  date && date <= today ? (attendance[date] ?? "none") : "none";

const dayLabel = (
  letter: string,
  dayNum: number,
  date: string | undefined,
  state: AttendanceState,
) => {
  if (!date) return `${letter} ${dayNum}`;
  const weekday = new Date(`${date}T12:00:00`).toLocaleDateString(
    "en-US",
    WEEKDAY_FORMAT,
  );
  const base = `${weekday} ${dayNum}`;
  if (state === "none") return base;
  return state === "active"
    ? `${base}, you were here and logged activity`
    : `${base}, you were here`;
};

type Props = {
  readonly weekDays: readonly PlanDay[];
  readonly dayIndex: number;
  /** Presence by date from `attendance-store`; dots fade in once loaded. */
  readonly attendance?: Readonly<Record<string, AttendanceState>>;
  /** Local today (`YYYY-MM-DD`); later days never get a dot. */
  readonly today?: string;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelectDay: (index: number) => void;
};

/** S15c compact week strip — one slim row (chevrons + 7 days), no month header. */
export const WeekStripCard = ({
  weekDays,
  dayIndex,
  attendance = {},
  today = new Date().toISOString().slice(0, 10),
  onPrev,
  onNext,
  onSelectDay,
}: Props) => {
  const strip =
    weekDays.length > 0
      ? weekDays.slice(0, 7).map((d, i) => ({
          letter: LETTERS[i] ?? "·",
          dayNum: Number(d.date.slice(-2)) || i + 1,
          active: i === dayIndex % 7,
          index: i,
          date: d.date as string | undefined,
        }))
      : Array.from({ length: 7 }, (_, i) => ({
          letter: LETTERS[i]!,
          dayNum: new Date().getDate() - 3 + i,
          active: i === 3,
          index: i,
          date: undefined as string | undefined,
        }));

  return (
    <View
      style={sx(
        "mb-space-sm flex-row items-center rounded-full bg-surface-container-low px-1 py-1",
      )}
    >
      <TodayIconBtn label="Previous day" Icon={ChevronLeft} small onPress={onPrev} />
      <View style={sx("flex-1 flex-row justify-between")}>
        {strip.map((day) => {
          const presence = presenceFor(day.date, today, attendance);
          return (
            <Pressable
              key={`${day.dayNum}-${day.index}`}
              accessibilityRole="button"
              accessibilityLabel={dayLabel(day.letter, day.dayNum, day.date, presence)}
              accessibilityState={{ selected: day.active }}
              onPress={() => onSelectDay(day.index)}
              style={sx("items-center gap-0.5 py-0.5")}
            >
              <Text
                style={sx(
                  `font-label text-label-caps ${
                    day.active ? "text-primary-fixed" : "text-on-surface-variant"
                  }`,
                )}
              >
                {day.letter}
              </Text>
              <View
                style={[
                  sx(
                    `h-8 w-8 items-center justify-center rounded-full ${
                      day.active ? "bg-primary-fixed" : ""
                    }`,
                  ),
                  day.active
                    ? {
                        shadowColor: color.primaryFixed,
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                      }
                    : null,
                ]}
              >
                <Text
                  style={sx(
                    `font-headline-sm text-label-md ${
                      day.active ? "text-on-primary-fixed" : "text-on-surface"
                    }`,
                  )}
                >
                  {day.dayNum}
                </Text>
              </View>
              <PresenceDot state={presence} />
            </Pressable>
          );
        })}
      </View>
      <TodayIconBtn label="Next day" Icon={ChevronRight} small onPress={onNext} />
    </View>
  );
};
