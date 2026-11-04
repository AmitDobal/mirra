/**
 * Tier hexagon + white glyph, drawn on Stitch S37's 40×40 grid
 * (DESIGN.md "Strength Tier Badges"). Scaled by the parent Svg viewBox.
 */
import { G, Path, Polygon, Rect } from "react-native-svg";

import { color } from "@/theme/tokens";

import type { TierId } from "./tier-meta";

/** Pointy-top hexagon, S37 points. */
export const HEX_POINTS = "20,2 37,11 37,29 20,38 3,29 3,11";

const INK = color.primary;
const LINE = {
  stroke: INK,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
  fill: "none",
};

const chevrons = (ys: readonly number[]) =>
  ys.map((y) => <Path key={y} d={`M14 ${y} L20 ${y - 4} L26 ${y}`} {...LINE} />);

export const TierGlyph = ({ tier }: { readonly tier: TierId }) => {
  switch (tier) {
    case "iron":
      return <Rect x={13} y={18.5} width={14} height={3} rx={1.5} fill={INK} />;
    case "bronze":
      return <Path d="M14 21 L20 16 L26 21" {...LINE} />;
    case "silver":
      return <G>{chevrons([17, 23.5])}</G>;
    case "gold":
      return <G>{chevrons([14.5, 20.5, 26.5])}</G>;
    case "platinum":
      return <Polygon points="20,11 28,20 20,29 12,20" fill="none" stroke={INK} strokeWidth={1.8} />;
    case "diamond":
      return (
        <G>
          <Polygon
            points="14,14 26,14 30,19 20,29 10,19"
            fill="none"
            stroke={INK}
            strokeLinejoin="round"
            strokeWidth={1.6}
          />
          <Path d="M14 14 L20 29 L26 14 M10 19 L30 19" stroke={INK} strokeWidth={1.4} fill="none" />
        </G>
      );
    case "elite":
      return (
        <Polygon
          points="20,11 22.8,17 29.5,17.8 24.5,22.4 25.9,29 20,25.6 14.1,29 15.5,22.4 10.5,17.8 17.2,17"
          fill={INK}
        />
      );
    case "legendary":
      return <Path d="M12 25 L12 17 L16 21 L20 14 L24 21 L28 17 L28 25 Z" fill={INK} />;
  }
};
