import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  MinusCircle,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { DailyGoal, GoalStatus } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

const STATUS_ICON = {
  pending: { Icon: Circle, tint: color.outline },
  done: { Icon: CheckCircle2, tint: color.primaryFixed },
  over: { Icon: AlertTriangle, tint: color.tertiaryFixedDim },
  skipped: { Icon: MinusCircle, tint: color.outlineVariant },
} satisfies Record<GoalStatus, { Icon: typeof Circle; tint: string }>;

const formatMetric = (metric: NonNullable<DailyGoal["metric"]>): string => {
  const { current, target, label } = metric;
  const unit = label === "g" || label === "L" ? label : ` ${label}`;
  return `${Math.round(current * 10) / 10}/${Math.round(target * 10) / 10}${unit}`;
};

type RowProps = {
  readonly goal: DailyGoal;
  readonly onPress: (goal: DailyGoal) => void;
};

const GoalRow = ({ goal, onPress }: RowProps) => {
  const { Icon, tint } = STATUS_ICON[goal.status];
  const muted = goal.status === "skipped";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}, ${goal.status}`}
      onPress={() => onPress(goal)}
      style={({ pressed }) => [
        sx("flex-row items-center gap-space-md px-space-md py-space-sm"),
        { opacity: pressed ? 0.8 : muted ? 0.6 : 1 },
      ]}
    >
      <Icon size={22} color={tint} />
      <View style={sx("flex-1")}>
        <Text style={sx("font-body-medium text-body-md text-on-surface")} numberOfLines={1}>
          {goal.title}
        </Text>
        {goal.subtitle ? (
          <Text
            style={sx("font-body text-body-sm text-on-surface-variant")}
            numberOfLines={1}
          >
            {goal.subtitle}
          </Text>
        ) : null}
      </View>
      {goal.metric ? (
        <Text style={[sx("font-label-bold text-label-md"), { color: tint }]}>
          {formatMetric(goal.metric)}
        </Text>
      ) : null}
      <ChevronRight size={18} color={color.onSurfaceVariant} />
    </Pressable>
  );
};

type Props = {
  readonly goals: readonly DailyGoal[];
  readonly onPress: (goal: DailyGoal) => void;
};

/** Compact tappable checklist; the whole row opens the goal's screen. */
export const GoalChecklist = ({ goals, onPress }: Props) => {
  if (goals.length === 0) return null;
  const done = goals.filter((g) => g.status === "done").length;
  return (
    <View style={sx("mb-space-md overflow-hidden rounded-lg bg-surface-container-low")}>
      <View style={sx("flex-row items-center justify-between px-space-md pt-space-md")}>
        <CapsLabel>Today checklist</CapsLabel>
        <CapsLabel tone="lime">
          {done}/{goals.length}
        </CapsLabel>
      </View>
      {goals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} onPress={onPress} />
      ))}
    </View>
  );
};
