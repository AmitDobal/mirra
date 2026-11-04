import { Pressable, StyleSheet, Text, View } from "react-native";

import { strengthCopy } from "@/content/strength";
import { TierBadge } from "@/features/strength-ui";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import type { OverallView } from "./strength-view";

type Props = {
  readonly view: OverallView;
  readonly onAddWeight?: () => void;
};

/** S34 overall card: lg badge + OVERALL / label / sub. Locked, empty and bodyweight reuse the shell. */
export const OverallCard = ({ view, onAddWeight }: Props) => {
  const place = view.kind === "ranked" ? view.place : null;
  return (
    <View style={styles.card}>
      <TierBadge tier={place?.tier ?? null} division={place?.division ?? null} size="lg" />
      <View style={styles.text}>
        <CapsLabel>{strengthCopy.overallEyebrow}</CapsLabel>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.sub}>{view.sub}</Text>
        {view.kind === "bodyweight" && onAddWeight ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAddWeight}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>{strengthCopy.bodyweightCta}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: space.sm,
    padding: space.lg,
    gap: space.lg,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  text: { flex: 1, justifyContent: "center" },
  title: {
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: type.headlineLg.tracking * type.headlineLg.size,
    color: color.onSurface,
  },
  sub: {
    marginTop: 2,
    fontFamily: font.body,
    fontSize: type.bodySm.size,
    lineHeight: type.bodySm.line,
    color: color.onSurfaceVariant,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: space.sm + 4,
    paddingHorizontal: space.md,
    height: 36,
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: color.primaryContainer,
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.onPrimaryFixed },
});
