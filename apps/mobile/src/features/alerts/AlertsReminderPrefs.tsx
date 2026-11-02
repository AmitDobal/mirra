import { Switch, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import { useAlertsStore } from "./alerts-store";

type RowProps = {
  readonly title: string;
  readonly value: boolean;
  readonly onChange: (v: boolean) => void;
};

const PrefRow = ({ title, value, onChange }: RowProps) => (
  <View style={sx("flex-row items-center justify-between py-space-xs")}>
    <Text style={sx("font-body-medium text-body-md text-on-surface")}>{title}</Text>
    <Switch
      accessibilityLabel={title}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixedDim }}
      thumbColor={value ? color.onPrimaryFixed : color.onSurfaceVariant}
    />
  </View>
);

/** Inbox header card once alerts are on: which nudges may land here. */
export const AlertsReminderPrefs = () => {
  const prefs = useAlertsStore((s) => s.prefs);
  const updatePrefs = useAlertsStore((s) => s.updatePrefs);
  if (!prefs) return null;
  return (
    <View style={sx("mb-space-md rounded-lg bg-surface-container-low px-space-md py-space-sm")}>
      <PrefRow
        title="Streak reminders"
        value={prefs.streakReminders}
        onChange={(v) => void updatePrefs({ streakReminders: v })}
      />
      <PrefRow
        title="Workout reminders"
        value={prefs.workoutReminders}
        onChange={(v) => void updatePrefs({ workoutReminders: v })}
      />
    </View>
  );
};
