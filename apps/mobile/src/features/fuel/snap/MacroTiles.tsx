import { MotiView } from "moti";
import { StyleSheet, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";

import { macroShares, type Macros } from "./snap-model";
import { timing } from "./motion";

type Props = { readonly totals: Macros };

/** Protein lime, carbs lavender, fat olive — Stitch macro dots. */
const TONES = {
  protein: color.primaryFixed,
  carbs: color.secondary,
  fat: color.outline,
} as const;

const Tile = ({
  label,
  grams,
  share,
  tone,
  delay,
}: {
  label: string;
  grams: number;
  share: number;
  tone: string;
  delay: number;
}) => (
  <View
    style={styles.tile}
    accessible
    accessibilityLabel={`${label} ${grams} grams, ${share} percent of calories`}
  >
    <View style={styles.head}>
      <CapsLabel>{label}</CapsLabel>
      <View style={[styles.dot, { backgroundColor: tone }]} />
    </View>
    <Text style={styles.value}>{`${grams}g`}</Text>
    <Text style={styles.share}>{`${share}% cal`}</Text>
    <View style={styles.track}>
      <MotiView
        from={{ width: "0%" }}
        animate={{ width: `${Math.max(4, share)}%` }}
        transition={timing({ duration: 650, delay })}
        style={[styles.fill, { backgroundColor: tone }]}
      />
    </View>
  </View>
);

/** Protein / carbs / fat tiles; bars fill on mount and on edit. */
export const MacroTiles = ({ totals }: Props) => {
  const share = macroShares(totals);
  return (
    <View style={styles.row}>
      <Tile
        label="Protein"
        grams={totals.proteinG}
        share={share.p}
        tone={TONES.protein}
        delay={150}
      />
      <Tile label="Carbs" grams={totals.carbsG} share={share.c} tone={TONES.carbs} delay={250} />
      <Tile label="Fat" grams={totals.fatG} share={share.f} tone={TONES.fat} delay={350} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, marginBottom: space.md },
  tile: {
    flex: 1,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    padding: space.md,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  value: {
    marginTop: 6,
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 28,
    color: color.onSurface,
  },
  share: { fontFamily: font.body, fontSize: 11, color: color.onSurfaceVariant, marginBottom: 8 },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: color.surfaceContainerHighest,
    overflow: "hidden",
  },
  fill: { height: 5, borderRadius: 3 },
});
