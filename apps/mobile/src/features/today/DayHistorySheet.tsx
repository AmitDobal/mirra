import { Modal, Pressable, Text, View } from "react-native";

import type { DayHistory } from "@/lib/api";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { sx } from "@/theme/sx";

type Props = {
  readonly history: DayHistory | null;
  readonly onClose: () => void;
};

const titleFor = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const timeFor = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export const hasHistory = (h: DayHistory): boolean =>
  h.presence.state !== "none" ||
  h.workout.sessions > 0 ||
  h.meals.count > 0 ||
  h.water.loggedMl > 0 ||
  h.checkIn != null ||
  h.weightKg != null;

const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <View style={sx("mt-space-sm flex-row items-center justify-between")}>
    <CapsLabel>{label}</CapsLabel>
    <Text style={sx("font-body-medium text-body-md text-on-surface")}>
      {value}
    </Text>
  </View>
);

const workoutValue = (h: DayHistory): string => {
  const { sessions, completedSets, title } = h.workout;
  if (sessions > 0) {
    const sets = `${completedSets} ${completedSets === 1 ? "set" : "sets"}`;
    return `${title ?? "Workout"} · ${sets}`;
  }
  return h.plannedWorkout ? `${h.plannedWorkout.title} · not done` : "";
};

/** Read-only day detail. Same chrome as `FormSheet` (bottom sheet, dismiss on backdrop). */
export const DayHistorySheet = ({ history, onClose }: Props) => {
  if (!history) return null;
  const workout = workoutValue(history);
  const rows: [string, string][] = [];
  if (workout) rows.push(["Workout", workout]);
  if (history.meals.count > 0) {
    rows.push([
      "Meals",
      `${history.meals.kcal} kcal · ${history.meals.proteinG} g protein`,
    ]);
  }
  if (history.water.loggedMl > 0) {
    rows.push([
      "Water",
      `${history.water.loggedMl} / ${history.water.targetMl} ml`,
    ]);
  }
  if (history.checkIn)
    rows.push(["Check-in", history.checkIn.status.replace("_", " ")]);
  if (history.weightKg != null) rows.push(["Weight", `${history.weightKg} kg`]);
  if (history.presence.firstSeenAt != null) {
    rows.push(["Here at", timeFor(history.presence.firstSeenAt)]);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss day history"
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx(
            "rounded-t-lg bg-surface-container-low p-space-md pb-space-lg",
          )}
        >
          <CapsLabel>{titleFor(history.date)}</CapsLabel>
          {rows.length === 0 ? (
            <Text
              style={sx(
                "mt-space-sm font-body text-body-md text-on-surface-variant",
              )}
            >
              Nothing logged.
            </Text>
          ) : (
            rows.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))
          )}
          <LimeCta label="Close" onPress={onClose} style={sx("mt-space-md")} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
