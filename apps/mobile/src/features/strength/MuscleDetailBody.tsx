import { StyleSheet, Text, View } from "react-native";

import { strengthCopy } from "@/content/strength";
import { TierBadge } from "@/features/strength-ui";
import { color, font, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import type { MuscleDetailView } from "./strength-view";

/** S35 body under the sheet header: progress, lime next-set card, contributing lifts, footnote. */
export const MuscleDetailBody = ({ view }: { readonly view: MuscleDetailView }) => (
  <View>
    {view.progress ? (
      <View style={styles.progress}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{view.progress.label}</Text>
          <Text style={styles.progressPct}>{`${view.progress.pct}%`}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${view.progress.pct}%` }]} />
        </View>
      </View>
    ) : null}

    {view.next ? (
      <View style={styles.next}>
        <CapsLabel tone="dark" style={styles.nextEyebrow}>
          {strengthCopy.nextEyebrow}
        </CapsLabel>
        <Text style={styles.nextValue}>{view.next.display}</Text>
        <Text style={styles.nextLine}>{view.next.line}</Text>
      </View>
    ) : null}

    {view.note ? <Text style={styles.note}>{view.note}</Text> : null}

    {view.contributors.length > 0 ? (
      <>
        <CapsLabel style={styles.sectionLabel}>{strengthCopy.contributorsTitle}</CapsLabel>
        {view.contributors.map((c, i) => (
          <View key={c.id} style={[styles.row, i < view.contributors.length - 1 && styles.rowDivider]}>
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={styles.rowName}>
                {c.name}
              </Text>
              <Text numberOfLines={1} style={styles.rowDetail}>
                {c.detail}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <TierBadge tier={c.place?.tier ?? null} division={c.place?.division ?? null} size="sm" />
              <Text style={[styles.rowLabel, !c.place && styles.muted]}>{c.label}</Text>
            </View>
          </View>
        ))}
      </>
    ) : null}

    <Text style={styles.footnote}>{strengthCopy.footnote}</Text>
  </View>
);

const styles = StyleSheet.create({
  progress: { marginTop: space.xs },
  progressRow: { marginBottom: space.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontFamily: font.label, fontSize: 13, lineHeight: 18, letterSpacing: 0.13, color: color.onSurface },
  progressPct: { fontFamily: font.headline, fontSize: 13, lineHeight: 18, color: color.primaryContainer },
  track: { height: 8, borderRadius: radius.full, overflow: "hidden", backgroundColor: color.surfaceContainerHigh },
  fill: { height: "100%", borderRadius: radius.full, backgroundColor: color.primaryContainer },
  next: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: color.primaryContainer },
  nextEyebrow: { opacity: 0.8 },
  nextValue: {
    marginTop: 6,
    fontFamily: font.headline,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
    color: color.onPrimaryFixed,
  },
  nextLine: {
    marginTop: space.xs,
    fontFamily: font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: color.onPrimaryFixed,
    opacity: 0.9,
  },
  note: { marginTop: space.md, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurfaceVariant },
  sectionLabel: { marginTop: space.lg, marginBottom: space.xs },
  row: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: color.surfaceContainerHigh },
  rowText: { flex: 1, justifyContent: "center" },
  rowName: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20, color: color.onSurface },
  rowDetail: { marginTop: 2, fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.onSurfaceVariant },
  rowRight: { flexDirection: "row", alignItems: "center", gap: space.sm },
  rowLabel: { fontFamily: font.label, fontSize: 13, lineHeight: 18, color: color.onSurface },
  muted: { color: color.onSurfaceVariant },
  footnote: { marginTop: space.md, paddingTop: space.xs, fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.onSurfaceVariant },
});
