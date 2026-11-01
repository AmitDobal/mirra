import { Image, StyleSheet, Text, View } from "react-native";

import { s16LiveWorkoutHud, s19LogMeal } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly focus: string | null;
  readonly minutes: number;
  readonly totalSets: number;
  /** True once today has logged activity. */
  readonly workoutDone: boolean;
  readonly fuelTarget: number;
  readonly proteinTarget: number | null;
  readonly fuelPct: number;
};

const Bar = ({ pct, fill }: { readonly pct: number; readonly fill: string }) => (
  <View style={sx("h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest")}>
    <View
      style={{
        width: `${Math.max(0, Math.min(100, pct))}%`,
        height: 6,
        borderRadius: 3,
        backgroundColor: fill,
      }}
    />
  </View>
);

const Chip = ({ label, tone }: { readonly label: string; readonly tone: "lime" | "lilac" }) => (
  <View
    style={sx(
      `rounded-full px-2 py-0.5 ${
        tone === "lime" ? "bg-surface-container-highest" : "bg-secondary-container"
      }`,
    )}
  >
    <Text
      numberOfLines={1}
      style={sx(
        `font-label-bold text-label-md ${tone === "lime" ? "text-primary-fixed" : "text-secondary"}`,
      )}
    >
      {label}
    </Text>
  </View>
);

/** S15c twin target cards: workout (minutes + sets) and fuel (kcal target), both photo-led. */
export const TwinTargetCards = ({
  focus,
  minutes,
  totalSets,
  workoutDone,
  fuelTarget,
  proteinTarget,
  fuelPct,
}: Props) => (
  <View style={sx("mb-space-md flex-row gap-space-sm")}>
    <View style={sx("flex-1 gap-space-sm rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("flex-row flex-wrap items-center gap-1")}>
        <CapsLabel>Workout target</CapsLabel>
        {focus ? <Chip label={focus} tone="lime" /> : null}
      </View>
      <View style={sx("flex-row items-center gap-space-sm")}>
        <Image
          source={s16LiveWorkoutHud.athleteDeepSquat}
          accessibilityLabel="Workout target"
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={sx("min-w-0 flex-1")}>
          <Text style={sx("font-headline text-headline-sm text-on-surface")}>
            {minutes > 0 ? `${minutes}m` : "—"}
          </Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
            {totalSets > 0 ? `${totalSets} sets total` : "Rest day"}
          </Text>
        </View>
      </View>
      <Bar pct={workoutDone ? 100 : 0} fill={color.primaryFixed} />
    </View>

    <View style={sx("flex-1 gap-space-sm rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("flex-row flex-wrap items-center gap-1")}>
        <CapsLabel>Fuel target</CapsLabel>
        {proteinTarget ? <Chip label={`${proteinTarget}g protein`} tone="lilac" /> : null}
      </View>
      <View style={sx("flex-row items-center gap-space-sm")}>
        <Image
          source={s19LogMeal.mealFlankSteak}
          accessibilityLabel="Fuel target"
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={sx("min-w-0 flex-1")}>
          <Text style={sx("font-headline text-headline-sm text-on-surface")}>
            {fuelTarget ? fuelTarget.toLocaleString() : "—"}
          </Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
            kcal target
          </Text>
        </View>
      </View>
      <Bar pct={fuelPct} fill={color.secondary} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  thumb: { width: 48, height: 48, borderRadius: 24 },
});
