import Svg, { Ellipse, Path } from "react-native-svg";

import { color } from "@/theme/tokens";

import type { ImageryGender } from "@/features/onboarding/imagery";

import {
  FEMALE_REGIONS,
  MALE_REGIONS,
  type AnatomyRegionId,
  type RegionIntensity,
} from "./muscle-regions";

type Props = {
  readonly gender: ImageryGender;
  readonly highlights: Partial<Record<AnatomyRegionId, RegionIntensity>>;
  readonly height: number;
};

const passive = color.surfaceContainerHighest;
const primary = color.streakFire;
const secondary = color.primaryFixed;

const fillFor = (
  id: AnatomyRegionId,
  highlights: Partial<Record<AnatomyRegionId, RegionIntensity>>,
): string => {
  const level = highlights[id];
  if (level === "primary") return primary;
  if (level === "secondary") return secondary;
  return passive;
};

const opacityFor = (id: AnatomyRegionId, highlights: Partial<Record<AnatomyRegionId, RegionIntensity>>) =>
  highlights[id] ? 0.92 : 0.55;

/** Compact front silhouette + region ellipses (Stitch S31/S32 kinetic map). */
export const AnatomySilhouette = ({ gender, highlights, height }: Props) => {
  const regions = gender === "female" ? FEMALE_REGIONS : MALE_REGIONS;
  const head =
    gender === "female"
      ? "M120 24 C112 24 107 32 107 42 C107 52 112 60 120 60 C128 60 133 52 133 42 C133 32 128 24 120 24 Z"
      : "M120 20 C110 20 106 28 106 40 C106 52 112 60 120 60 C128 60 134 52 134 40 C134 28 130 20 120 20 Z";

  return (
    <Svg width="100%" height={height} viewBox="0 0 240 400" preserveAspectRatio="xMidYMid meet">
      <Path d={head} fill={passive} stroke={color.outlineVariant} strokeWidth={1.2} />
      <Path
        d="M108 70 Q82 78 68 118 Q74 160 80 114 L108 70 M132 70 Q158 78 172 118 Q166 160 160 114 L132 70"
        fill={passive}
        stroke={color.outlineVariant}
        strokeWidth={0.8}
      />
      <Path
        d="M106 75 Q88 116 106 120 L120 90 L134 75 Q152 116 134 120 L120 90 Z"
        fill={passive}
        opacity={0.9}
      />
      <Path d="M102 180 Q120 206 138 180 L120 182 Z" fill={passive} />
      <Path
        d="M88 194 Q78 270 94 292 Q112 268 114 204 Z M152 194 Q162 270 146 292 Q128 268 126 204 Z"
        fill={passive}
        opacity={0.85}
      />
      <Path
        d="M88 304 Q84 370 96 370 Q104 335 100 304 Z M152 304 Q156 370 144 370 Q136 335 140 304 Z"
        fill={passive}
        opacity={0.8}
      />
      {regions.map((r, i) => (
        <Ellipse
          key={`${r.id}-${i}`}
          cx={r.cx}
          cy={r.cy}
          rx={r.rx}
          ry={r.ry}
          fill={fillFor(r.id, highlights)}
          opacity={opacityFor(r.id, highlights)}
        />
      ))}
    </Svg>
  );
};
