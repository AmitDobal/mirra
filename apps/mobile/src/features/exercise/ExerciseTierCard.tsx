import { StyleSheet, Text, View } from "react-native";

import { TierBadge } from "@/features/strength-ui";
import { color, font, radius, space } from "@/theme/tokens";

import { placeOf, progressCopy, progressPct, tierCardCopy } from "./tier-format";
import type { StrengthState } from "./use-exercise-detail";

/** S36 "Your tier": md badge + label, progress to next division, next concrete set. */
export const ExerciseTierCard = ({ strength }: { readonly strength: StrengthState }) => {
  if (strength.status === "loading") {
    return (
      <View style={[styles.card, styles.loading]} accessibilityLabel="Loading your tier">
        <Text style={styles.eyebrow}>Your tier</Text>
      </View>
    );
  }
  const copy = tierCardCopy(strength.status === "ready" ? strength.data : null);

  if (copy.kind === "unranked") {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Your tier</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badgeLeft}>
            <TierBadge tier={null} size="md" />
            <Text style={styles.tierLabel}>{copy.title}</Text>
          </View>
        </View>
        <Text style={styles.body}>{copy.body}</Text>
      </View>
    );
  }

  const place = placeOf(copy.standing);
  const pct = progressPct(copy.standing);
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Your tier</Text>
      <View style={styles.badgeRow}>
        <View style={styles.badgeLeft}>
          <TierBadge tier={place.tier} division={place.division} size="md" />
          <Text style={styles.tierLabel}>{copy.standing.label}</Text>
        </View>
        <Text style={styles.toNext}>{progressCopy(copy.standing)}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {copy.next ? <Text style={styles.body}>{copy.next}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  loading: { minHeight: 132 },
  eyebrow: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  badgeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  tierLabel: { fontFamily: font.headlineSemi, fontSize: 18, lineHeight: 24, color: color.onSurface },
  toNext: { fontFamily: font.headlineSemi, fontSize: 12, lineHeight: 16, color: color.primaryFixed },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: color.surfaceContainerHigh,
  },
  fill: { height: 6, borderRadius: radius.full, backgroundColor: color.primaryFixed },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurface },
});
