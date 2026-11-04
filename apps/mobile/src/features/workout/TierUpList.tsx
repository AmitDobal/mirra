import { StyleSheet, Text, View } from "react-native";

import { changesCopy, fromCopy, orderTierChanges, placeOf, transitionCopy } from "@/features/exercise/tier-format";
import { TierBadge } from "@/features/strength-ui";
import type { ApiTierChange } from "@/lib/api/strength-exercise";
import { color, font, space } from "@/theme/tokens";

/** S38 draws the overall badge at 48pt; TierBadge md is 40pt. */
const OVERALL_SCALE = 48 / 40;

/** S38 "Tier up" card: overall row first (large badge), then up to 6 compact rows. */
export const TierUpList = ({ changes }: { readonly changes: readonly ApiTierChange[] }) => {
  const rows = orderTierChanges(changes);
  if (rows.length === 0) return null;
  const overall = rows[0]?.scope === "overall" ? rows[0] : null;
  const rest = overall ? rows.slice(1) : rows;

  return (
    <View style={styles.card} accessibilityLabel={`Tier up, ${changesCopy(rows.length)}`}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>Tier up</Text>
        <Text style={styles.count}>{changesCopy(rows.length)}</Text>
      </View>
      {overall ? <OverallRow change={overall} /> : null}
      {overall && rest.length ? <View style={styles.divider} /> : null}
      {rest.map((c) => (
        <CompactRow key={`${c.scope}:${c.refId}`} change={c} />
      ))}
    </View>
  );
};

const OverallRow = ({ change }: { readonly change: ApiTierChange }) => {
  const place = placeOf(change.to);
  return (
    <View style={styles.overall}>
      <View style={styles.overallBadge}>
        <TierBadge tier={place.tier} division={place.division} size="md" style={styles.scaled} />
      </View>
      <View style={styles.overallCopy}>
        <Text style={styles.overallLabel}>Overall</Text>
        <Text style={styles.overallTier}>{change.to.label}</Text>
        <Text style={styles.from}>{fromCopy(change)}</Text>
      </View>
    </View>
  );
};

const CompactRow = ({ change }: { readonly change: ApiTierChange }) => {
  const place = placeOf(change.to);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.smBadge}>
          <TierBadge tier={place.tier} division={place.division} size="sm" />
        </View>
        <Text style={styles.rowName} numberOfLines={1}>
          {change.name}
        </Text>
      </View>
      <Text style={styles.transition}>{transitionCopy(change)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: color.primaryFixed,
    backgroundColor: color.surfaceContainerLow,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  eyebrow: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.primaryFixed,
  },
  count: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.onSurfaceVariant },
  overall: { flexDirection: "row", alignItems: "center", minHeight: 72 },
  overallBadge: { width: 56, alignItems: "center", justifyContent: "center", marginRight: 14 },
  scaled: { transform: [{ scale: OVERALL_SCALE }] },
  overallCopy: { flex: 1, justifyContent: "center" },
  overallLabel: {
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  overallTier: { fontFamily: font.headlineSemi, fontSize: 20, lineHeight: 24, color: color.onSurface },
  from: { marginTop: 2, fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.onSurfaceVariant },
  divider: { height: 1, marginVertical: space.sm, backgroundColor: color.surfaceContainerHigh },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: space.sm },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  smBadge: { width: 24, alignItems: "center" },
  rowName: { flexShrink: 1, fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.onSurface },
  transition: { fontFamily: font.headlineSemi, fontSize: 12, lineHeight: 16, color: color.onSurface },
});
