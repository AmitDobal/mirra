import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnatomyPair, type AnatomyMode, type MuscleRole } from "@/features/anatomy";
import { color, font, space } from "@/theme/tokens";

import type { FocusMuscle } from "./body-map/catalog-muscles";
import { useProfileSex } from "./body-map/use-profile-sex";
import { legendNames } from "./exercise-muscles";

/** S36 figure height inside the "Muscles worked" card. */
const FIGURE_PT = 250;

type Props = {
  /** Resolved muscles (plan / server / catalog). Empty hides the section. */
  readonly muscles: readonly FocusMuscle[];
};

/** S36 "Muscles worked": front + back anatomy, lime primary, lavender secondary, legend. */
export const ExerciseAnatomySection = ({ muscles }: Props) => {
  const sex = useProfileSex();
  const mode = useMemo<AnatomyMode>(() => ({ kind: "focus", muscles }), [muscles]);
  if (muscles.length === 0) return null;
  const primary = legendNames(muscles, "primary");
  const secondary = legendNames(muscles, "secondary");

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>Muscles worked</Text>
      <View style={styles.card}>
        <AnatomyPair sex={sex === "female" ? "female" : "male"} mode={mode} height={FIGURE_PT} />
        <View style={styles.legend}>
          {primary ? <LegendItem role="primary" names={primary} /> : null}
          {secondary ? <LegendItem role="secondary" names={secondary} /> : null}
        </View>
      </View>
    </View>
  );
};

const LegendItem = ({ role, names }: { readonly role: MuscleRole; readonly names: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, role === "primary" ? styles.dotPrimary : styles.dotSecondary]} />
    <Text style={styles.legendRole}>{role === "primary" ? "Primary" : "Secondary"}</Text>
    <Text style={styles.legendNames} numberOfLines={2}>
      {names}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  section: { gap: 10 },
  eyebrow: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  card: {
    gap: space.md,
    padding: space.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: space.sm,
    rowGap: space.xs,
    paddingTop: 12,
    paddingHorizontal: space.xs,
    borderTopWidth: 1,
    borderTopColor: color.surfaceContainerHigh,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotPrimary: { backgroundColor: color.primaryContainer },
  dotSecondary: { backgroundColor: color.secondary },
  legendRole: { fontFamily: font.labelBold, fontSize: 12, lineHeight: 16, color: color.onSurface },
  legendNames: {
    flexShrink: 1,
    fontFamily: font.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurfaceVariant,
  },
});
