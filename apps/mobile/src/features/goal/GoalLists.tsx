import { Scale } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { TierBadge } from "@/features/strength-ui";
import { TIER_IDS, TIER_LABEL, type Division, type TierId } from "@/features/strength-ui/tier-meta";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import type { AdherenceRow, GoalMilestoneRow } from "./goal-view";

const c = goalCopy.screen;

/** "Bench press Silver I" → silver hexagon, division I (engine labels name the tier). */
const tierOf = (title: string): { tier: TierId | null; division: Division | null } => {
  const tier = TIER_IDS.find((t) => new RegExp(`\\b${TIER_LABEL[t]}\\b`).test(title)) ?? null;
  const div = title.match(/\b(III|II|I)\s*$/)?.[1] as Division | undefined;
  return { tier, division: div ?? null };
};

const Marker = ({ row }: { readonly row: GoalMilestoneRow }) => {
  if (row.marker === "strength") {
    const t = tierOf(row.title);
    return <TierBadge tier={t.tier} division={t.division} size="sm" />;
  }
  return <View style={[styles.dot, row.marker === "goal" ? styles.dotGoal : row.marker === "done" ? styles.dotDone : styles.dotOpen]} />;
};

/** S44 milestones: rows joined by a hairline; hollow lavender dots, silver hexagon, lime goal. */
export const GoalMilestones = ({ rows }: { readonly rows: readonly GoalMilestoneRow[] }) => (
  <View style={styles.section}>
    <CapsLabel style={styles.bright}>{c.milestonesTitle}</CapsLabel>
    <View style={[styles.card, styles.listCard]}>
      {rows.length > 1 ? <View style={styles.connector} /> : null}
      {rows.map((m) => (
        <View key={m.id} style={styles.row}>
          <View style={styles.markerCol}>
            <Marker row={m} />
          </View>
          <View style={styles.shrink}>
            <Text style={styles.rowTitle}>{m.title}</Text>
            {m.detail ? <Text style={styles.rowDetail}>{m.detail}</Text> : null}
          </View>
          {m.date ? <Text style={styles.rowDate}>{m.date}</Text> : null}
        </View>
      ))}
    </View>
  </View>
);

/** S44 "Stay on track": LAST 28 DAYS bars + one action line. */
export const GoalStayOnTrack = ({ rows, action }: { readonly rows: readonly AdherenceRow[]; readonly action: string | null }) =>
  rows.length === 0 && !action ? null : (
    <View style={styles.section}>
      <CapsLabel style={styles.bright}>{c.stayTitle}</CapsLabel>
      <View style={[styles.card, styles.stayCard]}>
        {rows.length ? <CapsLabel>{c.last28}</CapsLabel> : null}
        {rows.map((r) => (
          <View key={r.label} style={styles.barRow} accessibilityLabel={`${r.label} ${r.value}`}>
            <View style={styles.between}>
              <Text style={styles.rowTitle}>{r.label}</Text>
              <Text style={styles.barValue}>{r.value}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(r.ratio * 100)}%` }]} />
            </View>
          </View>
        ))}
        {action ? <Text style={[styles.action, rows.length > 0 && styles.actionRule]}>{action}</Text> : null}
      </View>
    </View>
  );

type ActionsProps = {
  readonly onLogWeight: () => void;
  readonly onEdit: () => void;
  readonly editLabel: string;
};

/** S44 footer: lime "Log weight" (scale icon), secondary "Edit goal", disclaimer. */
export const GoalActions = ({ onLogWeight, onEdit, editLabel }: ActionsProps) => (
  <View style={styles.section}>
    <LimeCta label={c.logWeight} onPress={onLogWeight} iconLeading icon={<Scale size={20} color={color.onPrimaryFixed} />} />
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editLabel}
      onPress={onEdit}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryText}>{editLabel}</Text>
    </Pressable>
    <Text style={styles.disclaimer}>{c.disclaimer}</Text>
  </View>
);

const bodyMd = { fontFamily: font.body, fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line } as const;
const labelMd = { fontFamily: font.label, fontSize: type.labelMd.size, lineHeight: type.labelMd.line } as const;

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  bright: { color: color.onSurface },
  card: {
    backgroundColor: color.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  listCard: { marginTop: 12, paddingHorizontal: space.md, paddingVertical: space.sm },
  connector: { position: "absolute", left: space.md + 11.5, top: 36, bottom: 36, width: 1, backgroundColor: color.outlineVariant },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  markerCol: { width: 24, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOpen: { borderWidth: 2, borderColor: color.secondary, backgroundColor: color.surfaceContainerLow },
  dotDone: { backgroundColor: color.secondary },
  dotGoal: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primaryContainer },
  shrink: { flex: 1, minWidth: 0 },
  rowTitle: { ...bodyMd, fontSize: 15, color: color.onSurface },
  rowDetail: { fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line, color: color.onSurfaceVariant },
  rowDate: { ...labelMd, color: color.onSurface },
  stayCard: { marginTop: 12, padding: space.md },
  barRow: { marginTop: space.md },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barValue: { ...labelMd, color: color.onSurface },
  track: { marginTop: 8, height: 6, borderRadius: 3, backgroundColor: color.surfaceContainerHighest, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.primaryContainer },
  action: { ...bodyMd, fontSize: 15, color: color.onSurface },
  actionRule: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.surfaceContainerHigh },
  secondary: {
    marginTop: 12,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
  secondaryText: { fontFamily: font.label, fontSize: type.labelLg.size, lineHeight: type.labelLg.line, color: color.onSurface },
  disclaimer: {
    marginTop: space.lg,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: 11,
    lineHeight: 16,
    color: color.onSurfaceVariant,
  },
});
