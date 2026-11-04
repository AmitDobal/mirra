/**
 * Strength tier badge (Stitch S37): pointy-top hexagon in the tier color with a
 * 2px bevel stroke and one white glyph, division pips underneath (III = 1,
 * II = 2, I = 3), Legendary gets a lime laurel arc instead of pips.
 * `tier={null}` draws the unranked outline. Never a circle (circles = Kinetic Rank).
 */
import { memo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";

import { color } from "@/theme/tokens";

import { HEX_POINTS, TierGlyph } from "./TierGlyph";
import { labelOf, pipCount, TIER_PALETTE, type Division, type TierId } from "./tier-meta";

export type TierBadgeSize = "sm" | "md" | "lg";

/** Hexagon edge in pt (DESIGN.md: sm 24, md 40, lg 72). */
export const TIER_BADGE_PT: Record<TierBadgeSize, number> = { sm: 24, md: 40, lg: 72 };

/** Pip dot / gap / top margin per size (S37 md: 6 / 4 / 6; S34 lg: 8). */
const PIP: Record<TierBadgeSize, { dot: number; gap: number; top: number }> = {
  sm: { dot: 4, gap: 3, top: 3 },
  md: { dot: 6, gap: 4, top: 6 },
  lg: { dot: 8, gap: 6, top: 8 },
};

export type TierBadgeProps = {
  /** null = unranked outline. */
  readonly tier: TierId | null;
  /** Division for the pip count. Ignored for Legendary and unranked. */
  readonly division?: Division | null;
  readonly size?: TierBadgeSize;
  /** "division": pips for `division`. "all": 3 pips (S37 ladder rows). "none": hexagon only. */
  readonly pips?: "division" | "all" | "none";
  readonly style?: StyleProp<ViewStyle>;
};

export const DivisionPips = ({
  tier,
  count,
  size = "md",
}: {
  readonly tier: TierId;
  readonly count: number;
  readonly size?: TierBadgeSize;
}) => {
  const p = PIP[size];
  return (
    <View style={[styles.pips, { gap: p.gap, height: p.dot }]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: p.dot,
            height: p.dot,
            borderRadius: p.dot / 2,
            backgroundColor: TIER_PALETTE[tier].fill,
          }}
        />
      ))}
    </View>
  );
};

const LaurelArc = ({ size }: { readonly size: TierBadgeSize }) => {
  const w = (TIER_BADGE_PT[size] * 28) / 40;
  return (
    <Svg width={w} height={(w * 6) / 28} viewBox="0 0 28 6" style={{ marginTop: PIP[size].top / 3 }}>
      <Path d="M2 1C6 5 22 5 26 1" stroke={color.tier.legendary} strokeLinecap="round" strokeWidth={1.2} fill="none" />
    </Svg>
  );
};

export const TierBadge = memo(function TierBadge({
  tier,
  division = null,
  size = "md",
  pips = "division",
  style,
}: TierBadgeProps) {
  const pt = TIER_BADGE_PT[size];
  const label = tier ? labelOf({ tier, division: tier === "legendary" ? null : division }) : "Unranked";
  const count =
    !tier || tier === "legendary" || pips === "none" ? 0 : pips === "all" ? 3 : pipCount(division);

  return (
    <View style={[styles.root, style]} accessible accessibilityRole="image" accessibilityLabel={`${label} tier`}>
      <Svg width={pt} height={pt} viewBox="0 0 40 40">
        {tier ? (
          <>
            <Polygon
              points={HEX_POINTS}
              fill={TIER_PALETTE[tier].fill}
              stroke={TIER_PALETTE[tier].bevel}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <TierGlyph tier={tier} />
          </>
        ) : (
          <Polygon
            points={HEX_POINTS}
            fill="none"
            stroke={color.surfaceContainerHighest}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
      </Svg>
      {tier === "legendary" && pips !== "none" ? <LaurelArc size={size} /> : null}
      {tier && count > 0 ? (
        <View style={{ marginTop: PIP[size].top }}>
          <DivisionPips tier={tier} count={count} size={size} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: "center" },
  pips: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
