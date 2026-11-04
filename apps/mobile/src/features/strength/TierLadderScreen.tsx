import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strengthCopy } from "@/content/strength";
import { DIVISIONS, TierBadge } from "@/features/strength-ui";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { useStrength } from "./strength-store";
import { StrengthTopBar } from "./StrengthTopBar";
import { ladderRows } from "./strength-view";
import { TierLadderRow } from "./TierLadderRow";

/** S37 Tier ladder: intro, divisions explainer, Legendary → Iron with the user's overall tier highlighted. */
export const TierLadderScreen = () => {
  const insets = useSafeAreaInsets();
  const { data, refresh } = useStrength();
  const [refreshing, setRefreshing] = useState(false);
  const rows = ladderRows(data?.overall ?? null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StrengthTopBar title={strengthCopy.ladderHeader} tone="bright" />
      <ScreenScroll refreshing={refreshing} onRefresh={onRefresh} dockPad={false} insetTop={false} style={styles.root}>
        <View style={styles.intro}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <CapsLabel tone="lime">{strengthCopy.ladderEyebrow}</CapsLabel>
          </View>
          <Text style={styles.title}>{strengthCopy.ladderTitle}</Text>
          <Text style={styles.body}>{strengthCopy.ladderIntro}</Text>
        </View>

        <View style={styles.divisions}>
          <CapsLabel style={styles.divisionsLabel}>{strengthCopy.divisionsTitle}</CapsLabel>
          <View style={styles.divisionRow}>
            {DIVISIONS.map((d) => (
              <View key={d} style={styles.division}>
                <TierBadge tier="gold" division={d} size="md" />
                <Text style={styles.divisionText}>{`Gold ${d}`}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>{strengthCopy.divisionsNote}</Text>
        </View>

        <View>
          <View style={styles.rail} />
          <View style={styles.rows}>
            {rows.map((row) => (
              <TierLadderRow key={row.tier} row={row} />
            ))}
          </View>
        </View>
      </ScreenScroll>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  intro: { marginTop: -space.sm, marginBottom: space.md },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.primaryContainer },
  title: {
    marginTop: space.xs,
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: type.headlineLg.tracking * type.headlineLg.size,
    color: color.onSurface,
  },
  body: { marginTop: space.sm, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurfaceVariant },
  divisions: {
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  divisionsLabel: { marginBottom: 12 },
  divisionRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: space.sm },
  division: { alignItems: "center" },
  divisionText: { marginTop: space.xs, fontFamily: font.label, fontSize: 12, lineHeight: 16, color: color.onSurface },
  note: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: type.bodySm.size,
    lineHeight: type.bodySm.line,
    color: color.onSurfaceVariant,
  },
  rail: {
    position: "absolute",
    left: 36,
    top: 24,
    bottom: 24,
    width: 1.5,
    backgroundColor: color.outlineVariant,
  },
  rows: { gap: space.sm },
});
