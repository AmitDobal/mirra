import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { HistoryRange } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

const RANGES: ReadonlyArray<{ readonly id: HistoryRange; readonly label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

type SegmentedProps = {
  readonly value: HistoryRange;
  readonly onChange: (range: HistoryRange) => void;
};

/** Day / Week / Month pill toggle — selected segment is the white pill. */
export const RangeSegmented = ({ value, onChange }: SegmentedProps) => (
  <View
    accessibilityRole="tablist"
    style={sx("mb-space-md flex-row rounded-full bg-surface-container-low p-1")}
  >
    {RANGES.map((r) => {
      const active = r.id === value;
      return (
        <Pressable
          key={r.id}
          accessibilityRole="tab"
          accessibilityLabel={`${r.label} history`}
          accessibilityState={{ selected: active }}
          onPress={() => onChange(r.id)}
          style={[
            sx("flex-1 items-center justify-center rounded-full"),
            { height: 40, backgroundColor: active ? color.primary : "transparent" },
          ]}
        >
          <Text
            style={sx(
              `font-label text-label-lg ${active ? "text-on-primary-fixed" : "text-on-surface-variant"}`,
            )}
          >
            {r.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

type NavProps = {
  readonly label: string;
  readonly canGoForward: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
};

/** `‹  📅 May 13 – May 19  ›` window stepper. */
export const WindowNav = ({ label, canGoForward, onPrev, onNext }: NavProps) => (
  <View style={sx("mb-space-md flex-row items-center justify-between")}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Previous period"
      hitSlop={12}
      onPress={onPrev}
      style={sx("h-11 w-11 items-center justify-center")}
    >
      <ChevronLeft size={20} color={color.onSurface} />
    </Pressable>
    <View style={sx("flex-row items-center gap-2")}>
      <CalendarDays size={16} color={color.primaryFixed} />
      <Text style={sx("font-label text-label-lg text-on-surface")}>{label}</Text>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Next period"
      accessibilityState={{ disabled: !canGoForward }}
      disabled={!canGoForward}
      hitSlop={12}
      onPress={onNext}
      style={[sx("h-11 w-11 items-center justify-center"), { opacity: canGoForward ? 1 : 0.3 }]}
    >
      <ChevronRight size={20} color={color.onSurface} />
    </Pressable>
  </View>
);
