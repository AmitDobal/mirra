import { Heart, SlidersHorizontal, Zap } from "lucide-react-native";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { s11GeneratingWeek } from "../../../../assets/stitch";
import { color, font, radius } from "@/theme/tokens";

import { GeneratingShimmerBar } from "./GeneratingShimmerBar";

type SplitCard = {
  key: string;
  image: number;
  imageOpacity: number;
  tint: string | null;
  titleBar: { width: number; color: string; sheen: string; delay: number };
  caption: string;
  captionColor: string;
  subBarWidth: number;
  pill: { icon: ReactNode; text: string; textColor: string; solid: boolean };
};

const ICON = 15;

const CARDS: readonly SplitCard[] = [
  {
    key: "lead",
    image: s11GeneratingWeek.athleteSquatBw,
    imageOpacity: 0.9,
    tint: `${color.primaryFixed}33`,
    titleBar: {
      width: 112,
      color: color.primaryFixed,
      sheen: "rgba(22,30,0,0.35)",
      delay: 0,
    },
    caption: "42 MIN",
    captionColor: color.onSurfaceVariant,
    subBarWidth: 160,
    pill: {
      icon: <Zap size={ICON} color={color.primaryFixed} />,
      text: "580 KCAL",
      textColor: color.primaryFixed,
      solid: true,
    },
  },
  {
    key: "recovery",
    image: s11GeneratingWeek.sprinterKneelingBw,
    imageOpacity: 0.85,
    tint: `${color.secondary}4D`,
    titleBar: {
      width: 128,
      color: color.secondary,
      sheen: "rgba(255,255,255,0.4)",
      delay: 180,
    },
    caption: "ACTIVE REC",
    captionColor: color.onSurfaceVariant,
    subBarWidth: 144,
    pill: {
      icon: <Heart size={ICON} color={color.secondary} />,
      text: "118 BPM",
      textColor: color.secondary,
      solid: true,
    },
  },
  {
    key: "hypertrophy",
    image: s11GeneratingWeek.athleteBarbellBw,
    imageOpacity: 0.75,
    tint: null,
    titleBar: {
      width: 96,
      color: color.surfaceBright,
      sheen: "rgba(255,255,255,0.3)",
      delay: 360,
    },
    caption: "SYNTHESIZING",
    captionColor: color.outlineVariant,
    subBarWidth: 192,
    pill: {
      icon: <SlidersHorizontal size={ICON} color={color.outline} />,
      text: "SETS 4/5",
      textColor: color.onSurfaceVariant,
      solid: false,
    },
  },
];

const Row = ({ card }: { card: SplitCard }) => (
  <View style={styles.card}>
    <View style={styles.left}>
      <View style={styles.avatar}>
        <Image
          source={card.image}
          style={[styles.avatarImg, { opacity: card.imageOpacity }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        {card.tint ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: card.tint }]} />
        ) : null}
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <GeneratingShimmerBar
            width={card.titleBar.width}
            height={12}
            baseColor={card.titleBar.color}
            sheenColor={card.titleBar.sheen}
            delay={card.titleBar.delay}
          />
          <Text
            style={[styles.caption, { color: card.captionColor }]}
            numberOfLines={1}
          >
            {card.caption}
          </Text>
        </View>
        <GeneratingShimmerBar
          width={card.subBarWidth}
          height={10}
          baseColor={color.surfaceContainerHighest}
          sheenColor="rgba(203,241,80,0.22)"
          delay={card.titleBar.delay + 120}
        />
      </View>
    </View>
    <View style={[styles.pill, card.pill.solid ? null : styles.pillMuted]}>
      {card.pill.icon}
      <Text
        style={[
          styles.pillText,
          { color: card.pill.textColor },
          card.pill.solid ? styles.pillTextBold : null,
        ]}
      >
        {card.pill.text}
      </Text>
    </View>
  </View>
);

/** Three skeleton split cards with athlete cutouts + shimmer bars (Stitch S11). */
export const GeneratingSplitCards = () => (
  <View style={styles.stack}>
    {CARDS.map((card) => (
      <Row key={card.key} card={card} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: color.surfaceContainer,
    overflow: "hidden",
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: color.surfaceContainerHigh,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  texts: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  caption: {
    flexShrink: 0,
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
  },
  pillMuted: {
    backgroundColor: `${color.surfaceContainerHigh}99`,
  },
  pillText: {
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
  },
  pillTextBold: {
    fontFamily: font.labelBold,
  },
});
