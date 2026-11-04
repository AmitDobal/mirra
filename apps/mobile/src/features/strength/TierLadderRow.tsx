import { StyleSheet, Text, View } from "react-native";

import { DivisionPips, TIER_LABEL, TierBadge } from "@/features/strength-ui";
import { color, font, radius, space, type } from "@/theme/tokens";

import type { LadderRow } from "./strength-view";

/** S37 72pt tier row: md badge + pips, tier name, divisions text or the lime "You · Silver II" pill. */
export const TierLadderRow = ({ row }: { readonly row: LadderRow }) => (
  <View style={[styles.row, row.current && styles.current]}>
    <View style={styles.left}>
      <View style={styles.badge}>
        <TierBadge tier={row.tier} size="md" pips={row.tier === "legendary" ? "division" : "none"} />
        {row.pips > 0 ? (
          <View style={styles.pips}>
            <DivisionPips tier={row.tier} count={row.pips} size="md" />
          </View>
        ) : null}
      </View>
      <Text style={styles.name}>{TIER_LABEL[row.tier]}</Text>
    </View>
    {row.current ? (
      <View style={styles.pill}>
        <Text style={styles.pillText}>{row.right}</Text>
      </View>
    ) : (
      <Text style={styles.right}>{row.right}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    height: 72,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  current: { borderWidth: 1.5, borderColor: color.primaryContainer },
  left: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: { width: 40, alignItems: "center", justifyContent: "center" },
  pips: { marginTop: space.xs },
  name: {
    fontFamily: font.headlineSemi,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  right: { fontFamily: font.label, fontSize: 13, lineHeight: 18, color: color.onSurfaceVariant },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: color.primaryContainer,
  },
  pillText: { fontFamily: font.label, fontSize: 12, lineHeight: 16, color: color.onPrimaryFixed },
});
