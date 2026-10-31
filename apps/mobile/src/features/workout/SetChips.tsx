import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

import type { SetSlot } from "./workout-store";

type Props = {
  sets: readonly SetSlot[];
  /** Current (next-to-log) set number. */
  setIndex: number;
  editingSet: number | null;
  targetReps: string;
  onSelect: (n: number) => void;
};

const formatKg = (kg: number) => (Number.isInteger(kg) ? `${kg}` : kg.toFixed(1));

/** `100×8` once logged; bodyweight (0 kg) shows `8 reps`. */
const chipText = (s: SetSlot, targetReps: string): string => {
  if (!s.done) return `${targetReps} reps`;
  const reps = s.reps ?? 0;
  return s.weightKg ? `${formatKg(s.weightKg)}×${reps}` : `${reps} reps`;
};

/** SET 1..N chips. Tap a logged chip to edit it. */
export const SetChips = ({ sets, setIndex, editingSet, targetReps, onSelect }: Props) => (
  <View style={sx("mt-space-md flex-row justify-between gap-space-xs")}>
    {sets.map((s) => {
      const active = editingSet === s.n || (editingSet === null && s.n === setIndex && !s.done);
      return (
        <Pressable
          key={s.n}
          accessibilityRole="button"
          accessibilityLabel={`Set ${s.n}, ${chipText(s, targetReps)}${s.done ? ", tap to edit" : ""}`}
          accessibilityState={{ selected: active }}
          disabled={!s.done && s.n !== setIndex}
          onPress={() => onSelect(s.n)}
          style={sx(`flex-1 items-center rounded-sm border py-space-sm ${
            s.done ? "bg-primary-fixed" : "bg-surface-container-highest"
          } ${active ? "border-primary" : "border-transparent"}`)}
        >
          <CapsLabel tone={s.done ? "dark" : "muted"}>SET {s.n}</CapsLabel>
          <Text
            style={sx(`font-body text-body-sm ${
              s.done ? "text-on-primary-fixed" : "text-on-surface"
            }`)}
          >
            {chipText(s, targetReps)}
          </Text>
        </Pressable>
      );
    })}
  </View>
);
