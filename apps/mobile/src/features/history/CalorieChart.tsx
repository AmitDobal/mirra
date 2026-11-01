import { Fragment, useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";

import type { HistoryRange } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color, font } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { Dot, DashedRule, Segment, type ChartPoint } from "./ChartLine";
import { dayTick, fmtKcal, fmtMinutes, isOver, NA, type HistoryDay } from "./history-model";

const PLOT_H = 150;
const TOP_PAD = 20;
const MAX_BAR_W = 30;
const LINE_SCALE = 0.85;

type Props = {
  readonly days: readonly HistoryDay[];
  readonly range: HistoryRange;
  readonly target: number | null;
  readonly hasData: boolean;
  /** True while the first payload for this window is in flight (no N/A flash). */
  readonly loading: boolean;
};

const Legend = () => (
  <View style={sx("items-end gap-1")}>
    <View style={sx("flex-row items-center gap-1.5")}>
      <Text style={sx("font-label text-label-caps text-on-surface-variant")}>Under Target</Text>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color.primaryContainer }} />
    </View>
    <View style={sx("flex-row items-center gap-1.5")}>
      <Text style={sx("font-label text-label-caps text-on-surface-variant")}>Over Target</Text>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color.secondary }} />
    </View>
    <View style={sx("flex-row items-center gap-1.5")}>
      <Text style={sx("font-label text-label-caps text-on-surface-variant")}>Workout (min)</Text>
      <View style={{ width: 10, height: 2, backgroundColor: color.onSurface }} />
    </View>
  </View>
);

const tickVisible = (i: number, range: HistoryRange): boolean => {
  if (range !== "month") return true;
  return i === 0 || (i + 1) % 5 === 0;
};

/** Daily kcal bars vs target, with workout minutes as a line series (Stitch s18b). */
export const CalorieChart = ({ days, range, target, hasData, loading }: Props) => {
  const [width, setWidth] = useState(0);
  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = days.length;
  const compact = range === "month";
  const colW = width > 0 && n > 0 ? width / n : 0;
  const barW = Math.min(MAX_BAR_W, colW * (compact ? 0.62 : 0.6));
  const maxKcal = Math.max(1, ...days.map((d) => d.kcalIn), target ?? 0) * 1.12;
  const maxMin = Math.max(1, ...days.map((d) => d.workoutMinutes));

  const barH = (d: HistoryDay) => (d.logged ? Math.max(3, (d.kcalIn / maxKcal) * PLOT_H) : 0);
  const cx = (i: number) => (i + 0.5) * colW;

  const points: Array<ChartPoint & { readonly i: number }> = days.flatMap((d, i) =>
    d.workoutMinutes > 0
      ? [{ i, x: cx(i), y: TOP_PAD + PLOT_H - (d.workoutMinutes / maxMin) * PLOT_H * LINE_SCALE }]
      : [],
  );
  const goalTop = target ? TOP_PAD + PLOT_H - (target / maxKcal) * PLOT_H : null;

  const a11y = hasData
    ? `Daily calorie intake, ${days.filter((d) => d.logged).length} days logged`
    : "Daily calorie intake, no data";

  return (
    <View style={sx("mb-space-md rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("mb-space-md flex-row items-start justify-between")}>
        <View style={sx("flex-1 pr-space-sm")}>
          <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>
            Daily Calorie Intake
          </Text>
          <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
            {target ? `Target baseline: ${fmtKcal(target)} kcal` : `Target baseline: ${loading ? "…" : NA}`}
          </Text>
        </View>
        <Legend />
      </View>

      <View
        accessible
        accessibilityLabel={a11y}
        onLayout={handleLayout}
        style={{ height: PLOT_H + TOP_PAD, width: "100%" }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            backgroundColor: color.outlineVariant,
          }}
        />
        {width > 0 && hasData ? (
          <>
            {goalTop !== null ? <DashedRule top={goalTop} width={width} /> : null}
            {goalTop !== null && target ? (
              <Text
                style={{
                  position: "absolute",
                  right: 0,
                  top: goalTop - 14,
                  fontFamily: font.label,
                  fontSize: 9,
                  color: color.onSurfaceVariant,
                }}
              >
                {`${fmtKcal(target)} GOAL`}
              </Text>
            ) : null}
            {days.map((d, i) => {
              const h = barH(d);
              if (h === 0) return null;
              return (
                <Fragment key={d.date}>
                  <View
                    style={{
                      position: "absolute",
                      left: cx(i) - barW / 2,
                      bottom: 0,
                      width: barW,
                      height: h,
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                      backgroundColor: isOver(d) ? color.secondary : color.primaryContainer,
                    }}
                  />
                  {compact ? null : (
                    <Text
                      style={{
                        position: "absolute",
                        left: cx(i) - colW / 2,
                        width: colW,
                        bottom: h + 3,
                        textAlign: "center",
                        fontFamily: font.label,
                        fontSize: 10,
                        color: color.onSurface,
                      }}
                    >
                      {fmtKcal(d.kcalIn)}
                    </Text>
                  )}
                </Fragment>
              );
            })}
            {points.slice(1).map((p, k) => {
              const prev = points[k];
              return prev ? <Segment key={`s-${p.i}`} from={prev} to={p} /> : null;
            })}
            {points.map((p) => (
              <Dot key={`d-${p.i}`} at={p} size={compact ? 5 : 8} />
            ))}
          </>
        ) : null}
        {width > 0 && !hasData ? (
          <View style={sx("absolute inset-0 items-center justify-center")}>
            <Text style={sx("font-display text-headline-lg text-on-surface-variant")}>
              {loading ? "…" : NA}
            </Text>
            <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
              {loading ? "Loading history" : "Nothing logged in this period"}
            </Text>
          </View>
        ) : null}
      </View>

      {width > 0 ? (
        <View style={{ marginTop: 8, height: compact ? 16 : 34 }}>
          {days.map((d, i) =>
            tickVisible(i, range) ? (
              <View
                key={d.date}
                style={{
                  position: "absolute",
                  left: cx(i) - Math.max(colW, 24) / 2,
                  width: Math.max(colW, 24),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: font.labelBold,
                    fontSize: 10,
                    color: color.onSurface,
                  }}
                >
                  {dayTick(d.date, range)}
                </Text>
                {compact ? null : (
                  <Text
                    style={{
                      marginTop: 2,
                      fontFamily: font.body,
                      fontSize: 9,
                      color: color.onSurfaceVariant,
                    }}
                  >
                    {fmtMinutes(d.workoutMinutes)}
                  </Text>
                )}
              </View>
            ) : null,
          )}
        </View>
      ) : null}
      {hasData ? (
        <View style={sx("mt-space-sm flex-row items-center")}>
          <CapsLabel>{compact ? "Workout minutes shown as line" : "Workout minutes under each day"}</CapsLabel>
        </View>
      ) : null}
    </View>
  );
};
