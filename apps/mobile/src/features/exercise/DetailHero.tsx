import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, font, radius, space } from "@/theme/tokens";

/** S36 hero height (pt), full bleed, square top, 28pt bottom radius. */
const HERO_PT = 260;

/** S36 hero photo with the round 40pt back button over it. */
export const DetailHero = ({ source, name }: { readonly source: ImageSourcePropType; readonly name: string }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { height: Math.max(HERO_PT, insets.top + 216) }]}>
      <Image source={source} style={styles.heroImg} resizeMode="cover" accessibilityLabel={name} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
        style={[styles.back, { top: insets.top + 4 }]}
      >
        <View style={styles.backScrim} />
        <ChevronLeft size={20} color={color.onSurface} />
      </Pressable>
    </View>
  );
};

type HeadProps = {
  readonly eyebrow: string;
  readonly name: string;
  /** First chip (muscle) is lavender filled; the rest are neutral. */
  readonly chips: readonly string[];
};

/** S36 label + headline + chip row. */
export const DetailHead = ({ eyebrow, name, chips }: HeadProps) => (
  <View style={styles.head}>
    <View style={styles.titleBlock}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{name}</Text>
    </View>
    {chips.length ? (
      <View style={styles.chips}>
        {chips.map((c, i) => (
          <View key={`${c}-${i}`} style={[styles.chip, i === 0 ? styles.chipMuscle : styles.chipNeutral]}>
            <Text style={[styles.chipText, i === 0 ? styles.chipTextMuscle : styles.chipTextNeutral]}>{c}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: color.surfaceContainerLow,
  },
  heroImg: { width: "100%", height: "100%" },
  back: {
    position: "absolute",
    left: space.lg,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  backScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.surfaceContainerLowest,
    opacity: 0.5,
  },
  head: { gap: space.lg },
  titleBlock: { gap: 6 },
  eyebrow: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: "uppercase",
    color: color.primaryFixed,
  },
  title: { fontFamily: font.headline, fontSize: 28, lineHeight: 34, color: color.onSurface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  chipMuscle: { backgroundColor: color.secondary, borderColor: color.secondary },
  chipNeutral: { backgroundColor: color.surfaceContainerHigh, borderColor: color.surfaceContainerHigh },
  chipText: { fontSize: 12, lineHeight: 16 },
  chipTextMuscle: { fontFamily: font.headlineSemi, color: color.onSecondary },
  chipTextNeutral: { fontFamily: font.bodyMedium, color: color.onSurface },
});
