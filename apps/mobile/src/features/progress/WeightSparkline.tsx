import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";

import { color } from "@/theme/tokens";

type Props = {
  /** Oldest → newest. */
  readonly values: readonly number[];
  readonly height?: number;
};

const DOT = 8;
const LINE = 2;
const PAD = DOT / 2;

/** Pure-View sparkline: dots joined by rotated hairline segments. */
export const WeightSparkline = ({ values, height = 72 }: Props) => {
  const [width, setWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = Math.max(width - DOT, 1);
  const innerH = height - DOT;

  const points = values.map((v, i) => ({
    x: PAD + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: PAD + (max === min ? innerH / 2 : ((max - v) / span) * innerH),
  }));

  return (
    <View
      accessible
      accessibilityLabel={`Weight trend, ${values.length} entries`}
      onLayout={handleLayout}
      style={{ height, width: "100%" }}
    >
      {width > 0
        ? points.map((p, i) => {
            const next = points[i + 1];
            const isLast = i === points.length - 1;
            return (
              <View key={`${i}-${p.x}`} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                {next ? <Segment from={p} to={next} /> : null}
                <View
                  style={{
                    position: "absolute",
                    left: p.x - PAD,
                    top: p.y - PAD,
                    width: DOT,
                    height: DOT,
                    borderRadius: DOT / 2,
                    backgroundColor: isLast ? color.primaryFixed : color.onSurfaceVariant,
                  }}
                />
              </View>
            );
          })
        : null}
    </View>
  );
};

type Point = { readonly x: number; readonly y: number };

const Segment = ({ from, to }: { from: Point; to: Point }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  return (
    <View
      style={{
        position: "absolute",
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - LINE / 2,
        width: length,
        height: LINE,
        backgroundColor: color.primaryFixed,
        opacity: 0.6,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
};
