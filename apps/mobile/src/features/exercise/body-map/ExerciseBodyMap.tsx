import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnatomyPair, MUSCLE_LABEL, type AnatomyMode, type MuscleRole } from "@/features/anatomy";
import { color, font, space } from "@/theme/tokens";

import type { CatalogEntry } from "../catalog";
import { focusMusclesFor, type FocusMuscle } from "./catalog-muscles";
import { useProfileSex } from "./use-profile-sex";

type Props = {
  readonly entry: CatalogEntry;
};

/** S36 figure height inside the "Muscles worked" card. */
const FIGURE_PT = 250;

const namesFor = (muscles: readonly FocusMuscle[], role: MuscleRole) =>
  muscles
    .filter((m) => m.role === role)
    .map((m) => MUSCLE_LABEL[m.id])
    .join(", ");

/** S36 "Muscles worked": real anatomy front + back, lime primary, lavender secondary. */
export const ExerciseBodyMap = ({ entry }: Props) => {
  const sex = useProfileSex();
  const focus = useMemo(() => focusMusclesFor(entry.muscles, entry.muscle), [entry]);
  const mode = useMemo<AnatomyMode>(() => ({ kind: "focus", muscles: focus }), [focus]);
  const primary = namesFor(focus, "primary");
  const secondary = namesFor(focus, "secondary");

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>Muscles worked</Text>
      <View style={styles.card}>
        <AnatomyPair sex={sex === "female" ? "female" : "male"} mode={mode} height={FIGURE_PT} />
        {primary || secondary ? (
          <View style={styles.legend}>
            {primary ? <LegendItem role="primary" names={primary} /> : null}
            {secondary ? <LegendItem role="secondary" names={secondary} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const LegendItem = ({ role, names }: { readonly role: MuscleRole; readonly names: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, role === "primary" ? styles.dotPrimary : styles.dotSecondary]} />
    <Text style={styles.legendRole}>{role === "primary" ? "Primary" : "Secondary"}</Text>
    <Text style={styles.legendNames} numberOfLines={1}>
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
    gap: space.sm,
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
