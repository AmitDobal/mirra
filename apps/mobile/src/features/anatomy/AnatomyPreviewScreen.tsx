/**
 * Dev-only gallery for AMI-162 smoke screenshots (route `/dev-anatomy`, gated by __DEV__).
 * Male tier mode, female focus mode, S34 toggle, every tier badge.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findCatalogById } from "@/features/exercise/catalog";
import { ExerciseBodyMap } from "@/features/exercise/body-map/ExerciseBodyMap";
import { DIVISIONS, stepOf, TIER_IDS, TierBadge, tierOfStep, type TierBadgeSize } from "@/features/strength-ui";
import { color, font, space } from "@/theme/tokens";

import { AnatomyPair } from "./AnatomyPair";
import type { AnatomyMode } from "./region-fill";

const MIXED_TIERS: AnatomyMode = {
  kind: "tier",
  steps: {
    chest: 9,
    front_delts: 6,
    side_delts: 6,
    rear_delts: 7,
    biceps: 7,
    triceps: 8,
    lats: 8,
    upper_back: 8,
    traps: 13,
    quads: 5,
    glutes: 4,
    hamstrings: 3,
    calves: 16,
    forearms: 19,
    lower_back: 21,
  },
};

const BENCH: AnatomyMode = {
  kind: "focus",
  muscles: [
    { id: "chest", role: "primary" },
    { id: "front_delts", role: "secondary" },
    { id: "triceps", role: "secondary" },
  ],
};

const SQUAT: AnatomyMode = {
  kind: "focus",
  muscles: [
    { id: "quads", role: "primary" },
    { id: "glutes", role: "primary" },
    { id: "hamstrings", role: "secondary" },
    { id: "lower_back", role: "secondary" },
  ],
};

const SIZES: readonly TierBadgeSize[] = ["sm", "md", "lg"];

export const AnatomyPreviewScreen = () => {
  const insets = useSafeAreaInsets();
  const bench = findCatalogById("barbell-bench-press");
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}
    >
      {bench ? <ExerciseBodyMap entry={bench} /> : null}
      <Section title="Male · tier mode (mixed)">
        <AnatomyPair sex="male" mode={MIXED_TIERS} height={250} />
      </Section>
      <Section title="Female · focus · bench">
        <AnatomyPair sex="female" mode={BENCH} height={250} />
      </Section>
      <Section title="Female · focus · squat">
        <AnatomyPair sex="female" mode={SQUAT} height={250} />
      </Section>
      <Section title="Male · tier · S34 toggle">
        <AnatomyPair sex="male" mode={MIXED_TIERS} height={340} layout="toggle" />
      </Section>
      <Section title="Tier badges · division pips">
        <View style={styles.grid}>
          {TIER_IDS.map((t, i) => {
            const place = tierOfStep(stepOf(t, DIVISIONS[i % 3] ?? "III"));
            return (
              <View key={t} style={styles.cell}>
                <TierBadge tier={place.tier} division={place.division} />
                <Text style={styles.caption}>
                  {place.division ? `${t} ${place.division}` : t}
                </Text>
              </View>
            );
          })}
          <View style={styles.cell}>
            <TierBadge tier={null} />
            <Text style={styles.caption}>unranked</Text>
          </View>
        </View>
      </Section>
      <Section title="Ladder rows (all pips) · sizes">
        <View style={styles.grid}>
          {TIER_IDS.map((t) => (
            <TierBadge key={t} tier={t} pips="all" />
          ))}
        </View>
        <View style={[styles.grid, styles.sizes]}>
          {SIZES.map((s) => (
            <TierBadge key={s} tier="silver" division="II" size={s} />
          ))}
          <TierBadge tier="legendary" size="lg" />
        </View>
      </Section>
    </ScrollView>
  );
};

const Section = ({ title, children }: { readonly title: string; readonly children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: space.margin, paddingBottom: space.dockClearance, gap: space.lg },
  section: { gap: space.sm },
  title: {
    fontFamily: font.labelBold,
    fontSize: 11,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  card: {
    padding: space.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, alignItems: "flex-start" },
  sizes: { marginTop: space.lg, alignItems: "center" },
  cell: { width: 64, alignItems: "center", gap: space.xs },
  caption: { fontFamily: font.label, fontSize: 11, color: color.onSurface, textTransform: "capitalize" },
});
