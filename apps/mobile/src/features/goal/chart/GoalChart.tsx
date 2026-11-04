import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { goalCopy } from "@/content/goal";
import { color, font, type } from "@/theme/tokens";

import {
  buildGoalChartModel,
  type GoalChartData,
  type GoalChartVariant,
} from "./goal-chart-model";

export type GoalChartProps = {
  /** Engine / API `GoalChart` (kg, weekly from `start`). */
  readonly data: GoalChartData;
  /** `onboarding` S43 (no actuals), `full` S44 (actual dots + trend + today hairline), `spark` S45/S46. */
  readonly variant: GoalChartVariant;
  /** Fractional week of the expected ETA; the dashed line ends there. `null` = full series. */
  readonly etaWeeks?: number | null;
  /** Defaults: full 180, onboarding 140, spark 56 (arch §7). */
  readonly height?: number;
  readonly accessibilityLabel: string;
};

const DEFAULT_H = { full: 180, onboarding: 140, spark: 56 } as const;

/**
 * Goal projection chart (react-native-svg only): band (optimistic → conservative), dashed
 * expected line to the ETA, dashed goal hairline + label, today marker, month labels,
 * optional weigh-in dots + trend. Geometry lives in `goal-chart-model.ts`.
 */
export const GoalChart = ({ data, variant, etaWeeks = null, height, accessibilityLabel }: GoalChartProps) => {
  const [width, setWidth] = useState(0);
  const h = height ?? DEFAULT_H[variant];
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const m =
    width > 0
      ? buildGoalChartModel({
          data,
          width,
          height: h,
          variant,
          etaWeeks,
          todayLabel: goalCopy.chart.today,
          goalLabel: goalCopy.chart.goal,
        })
      : null;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{ width: "100%", height: h }}
    >
      {m ? (
        <Svg width={m.width} height={m.height}>
          {m.band ? <Path d={m.band} fill={color.secondary} fillOpacity={0.16} /> : null}
          {m.target ? (
            <Line
              x1={m.target.x1}
              x2={m.target.x2}
              y1={m.target.y}
              y2={m.target.y}
              stroke={color.outlineVariant}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}
          {m.todayLine !== null ? (
            <Line x1={m.todayLine} x2={m.todayLine} y1={0} y2={h - 24} stroke={color.outlineVariant} strokeWidth={1} />
          ) : null}
          {m.expected ? (
            <Path d={m.expected} stroke={color.secondary} strokeWidth={2} strokeDasharray="4 4" fill="none" />
          ) : null}
          {m.expectedEnd ? <Circle cx={m.expectedEnd.x} cy={m.expectedEnd.y} r={3.5} fill={color.secondary} /> : null}
          {m.trend ? <Path d={m.trend} stroke={color.primaryContainer} strokeWidth={2.5} fill="none" /> : null}
          {m.dots.map((d, i) => (
            <Circle key={`d${i}`} cx={d.x} cy={d.y} r={2} fill={color.onSurfaceVariant} />
          ))}
          {m.target?.label ? (
            <SvgText
              x={m.target.label.x}
              y={m.target.label.y}
              textAnchor="end"
              fill={color.onSurfaceVariant}
              fontFamily={font.label}
              fontSize={type.bodySm.size}
            >
              {m.target.label.text}
            </SvgText>
          ) : null}
          {m.yLabels.map((l) => (
            <SvgText
              key={`y${l.text}`}
              x={l.x}
              y={l.y}
              textAnchor="end"
              fill={color.onSurfaceVariant}
              fontFamily={font.label}
              fontSize={type.bodySm.size}
            >
              {l.text}
            </SvgText>
          ))}
          {m.xLabels.map((l) => (
            <SvgText
              key={`x${l.text}${l.x}`}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fill={color.onSurfaceVariant}
              fontFamily={font.labelBold}
              fontSize={type.labelCaps.size}
              letterSpacing={type.labelCaps.size * type.labelCaps.tracking}
            >
              {l.text}
            </SvgText>
          ))}
          {m.todayDot ? (
            <>
              {m.todayDot.label ? (
                <SvgText
                  x={m.todayDot.label.x}
                  y={m.todayDot.label.y}
                  fill={color.onSurfaceVariant}
                  fontFamily={font.label}
                  fontSize={10}
                >
                  {m.todayDot.label.text}
                </SvgText>
              ) : null}
              <Circle cx={m.todayDot.x} cy={m.todayDot.y} r={4} fill={color.primaryContainer} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
};
