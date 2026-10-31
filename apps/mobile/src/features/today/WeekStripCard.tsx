import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { PlanDay } from "@/lib/api";
import { CapsLabel } from "@/ui/CapsLabel";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { TodayIconBtn } from "./TodayIconBtn";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type Props = {
  readonly weekDays: readonly PlanDay[];
  readonly dayIndex: number;
  readonly weekLabel: string;
  readonly monthLabel: string;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelectDay: (index: number) => void;
};

/** S15 Calendar & Week Strip — month header, chevrons, 7-day rail. */
export const WeekStripCard = ({
  weekDays,
  dayIndex,
  weekLabel,
  monthLabel,
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
        }))
      : Array.from({ length: 7 }, (_, i) => ({
          letter: LETTERS[i]!,
          dayNum: new Date().getDate() - 3 + i,
          active: i === 3,
          index: i,
        }));

  return (
    <View style={sx("mb-space-md rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <View>
          <CapsLabel>{weekLabel}</CapsLabel>
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
            {monthLabel}
          </Text>
        </View>
        <View style={sx("flex-row gap-1 rounded-full bg-surface-container-high p-1")}>
          <TodayIconBtn label="Previous day" Icon={ChevronLeft} small onPress={onPrev} />
          <TodayIconBtn label="Next day" Icon={ChevronRight} small onPress={onNext} />
        </View>
      </View>
      <View style={sx("flex-row justify-between")}>
        {strip.map((day) => (
          <Pressable
            key={`${day.dayNum}-${day.index}`}
            accessibilityRole="button"
            accessibilityLabel={`${day.letter} ${day.dayNum}`}
            accessibilityState={{ selected: day.active }}
            onPress={() => onSelectDay(day.index)}
            style={sx("items-center gap-1.5 py-1")}
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
                  `h-9 w-9 items-center justify-center rounded-full ${
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
                  `font-headline-sm text-headline-sm ${
                    day.active ? "text-on-primary-fixed" : "text-on-surface"
                  }`,
                )}
              >
                {day.dayNum}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
