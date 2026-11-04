/**
 * Real anatomy figure (male/female, front/back). Path data vendored from
 * react-native-body-highlighter (MIT, see ./paths/LICENSE.md); renderer is ours.
 * Fills resolve once per (sex, side, mode) via useMemo, never per frame.
 */
import { memo, useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { color } from "@/theme/tokens";

import type { MuscleId } from "./muscle-ids";
import { figureArt, viewBoxAspect, type AnatomySex, type AnatomySide } from "./paths";
import { resolveRegions, type AnatomyMode, type RegionFill } from "./region-fill";

/** Stitch S34/S36 stroke: 0.8 on a 250-unit-tall figure, scaled with the art. */
const STROKE_RATIO = 0.8 / 250;

export type AnatomyFigureProps = {
  /** Unknown sex (null / undefined) renders male art. */
  readonly sex: AnatomySex | null | undefined;
  readonly side: AnatomySide;
  readonly mode: AnatomyMode;
  /** Rendered height in pt; width follows the art's aspect ratio. */
  readonly height: number;
  /** Called with the muscle ids drawn by the tapped region. */
  readonly onPressMuscle?: (ids: readonly MuscleId[]) => void;
  readonly style?: StyleProp<ViewStyle>;
};

const Region = memo(function Region({
  region,
  strokeWidth,
  onPressMuscle,
}: {
  readonly region: RegionFill;
  readonly strokeWidth: number;
  readonly onPressMuscle?: (ids: readonly MuscleId[]) => void;
}) {
  const pressable = Boolean(onPressMuscle) && region.muscles.length > 0;
  return (
    <G
      accessible={region.label !== undefined}
      accessibilityLabel={region.label}
      onPress={pressable ? () => onPressMuscle?.(region.muscles) : undefined}
    >
      {region.d.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill={region.fill}
          fillOpacity={region.fillOpacity}
          stroke={color.surfaceContainerLowest}
          strokeWidth={strokeWidth}
        />
      ))}
    </G>
  );
});

export const AnatomyFigure = memo(function AnatomyFigure({
  sex,
  side,
  mode,
  height,
  onPressMuscle,
  style,
}: AnatomyFigureProps) {
  const art = figureArt(sex === "female" ? "female" : "male", side);
  const regions = useMemo(() => resolveRegions(art.parts, side, mode), [art, side, mode]);
  const strokeWidth = (Number(art.viewBox.split(" ")[3]) || 1448) * STROKE_RATIO;
  const width = Math.round(height * viewBoxAspect(art.viewBox));

  return (
    <Svg
      width={width}
      height={height}
      viewBox={art.viewBox}
      style={style}
      accessibilityLabel={`${sex === "female" ? "Female" : "Male"} anatomy, ${side}`}
    >
      {regions.map((r) => (
        <Region key={r.key} region={r} strokeWidth={strokeWidth} onPressMuscle={onPressMuscle} />
      ))}
    </Svg>
  );
});
