import { View } from "react-native";

import { color } from "@/theme/tokens";

export type ChartPoint = { readonly x: number; readonly y: number };

const LINE = 2;

type SegmentProps = {
  readonly from: ChartPoint;
  readonly to: ChartPoint;
  readonly tint?: string;
};

/** One straight segment between two points (rotated hairline View). */
export const Segment = ({ from, to, tint = color.onSurface }: SegmentProps) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - LINE / 2,
        width: length,
        height: LINE,
        backgroundColor: tint,
        opacity: 0.85,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
};

type DotProps = {
  readonly at: ChartPoint;
  readonly size?: number;
  readonly tint?: string;
};

/** Ringed dot sitting on the series line. */
export const Dot = ({ at, size = 7, tint = color.onSurface }: DotProps) => (
  <View
    pointerEvents="none"
    style={{
      position: "absolute",
      left: at.x - size / 2,
      top: at.y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: tint,
      borderWidth: 1.5,
      borderColor: color.surfaceContainerLow,
    }}
  />
);

type DashedProps = {
  readonly top: number;
  readonly width: number;
  readonly tint?: string;
};

const DASH = 4;
const GAP = 4;

/** Horizontal dashed rule (goal line); built from tiny Views so it renders the same on iOS/Android. */
export const DashedRule = ({ top, width, tint = color.outline }: DashedProps) => {
  const count = Math.max(0, Math.floor(width / (DASH + GAP)));
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top, width, height: 1, flexDirection: "row" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ width: DASH, height: 1, marginRight: GAP, backgroundColor: tint }}
        />
      ))}
    </View>
  );
};
