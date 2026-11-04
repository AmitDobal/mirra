import type { MuscleGroupId } from "@mirra/contracts";
import { ArrowRight } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { strengthCopy } from "@/content/strength";
import { DivisionPips, pipCount, TierBadge } from "@/features/strength-ui";
import { color, font, radius, space, type } from "@/theme/tokens";

import type { GroupRow } from "./strength-view";

type Props = {
  readonly rows: readonly GroupRow[];
  readonly onPressGroup: (id: MuscleGroupId) => void;
  readonly onAllTiers: () => void;
};

/** S34 "Muscle groups" header + six 56pt rows in one card (sm badge, inline pips, label). */
export const MuscleGroupList = ({ rows, onPressGroup, onAllTiers }: Props) => (
  <View>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{strengthCopy.groupsTitle}</Text>
      <Pressable accessibilityRole="link" hitSlop={8} onPress={onAllTiers} style={styles.link}>
        <Text style={styles.linkText}>{strengthCopy.allTiers}</Text>
        <ArrowRight size={16} color={color.primaryContainer} />
      </Pressable>
    </View>
    <View style={styles.card}>
      {rows.map((row, i) => (
        <Fragment key={row.id}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.name}, ${row.label}`}
            onPress={() => onPressGroup(row.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.name}>{row.name}</Text>
            <View style={styles.right}>
              <View style={styles.badge}>
                <TierBadge tier={row.place?.tier ?? null} size="sm" pips="none" />
                {row.place && pipCount(row.place.division) > 0 ? (
                  <DivisionPips tier={row.place.tier} count={pipCount(row.place.division)} size="md" />
                ) : null}
              </View>
              <Text style={[styles.label, !row.place && styles.unranked]}>{row.label}</Text>
            </View>
          </Pressable>
        </Fragment>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    marginTop: space.lg + 4,
    marginBottom: 12,
    paddingHorizontal: space.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: font.headlineSemi,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  link: { flexDirection: "row", alignItems: "center", gap: space.xs },
  linkText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.primaryContainer },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: color.surfaceContainerHigh },
  row: {
    height: 56,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: { backgroundColor: color.surfaceContainer },
  name: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 24, color: color.onSurface },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.onSurface },
  unranked: { color: color.onSurfaceVariant },
});
