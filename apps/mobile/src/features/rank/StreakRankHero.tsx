import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { rankCopy } from "@/content/rank";
import { FlameIcon } from "@/features/today/FlameIcon";
import type { BadgeDefinition } from "@/lib/api/badges";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly streakCurrent: number;
  readonly bestStreak: number;
  /** Earned rank title; shown under "Current" once the ladder is complete (S33 shows the active tier). */
  readonly currentTitle: string | null;
  /** Tier being worked through; null once the ladder is complete. */
  readonly active: { readonly def: BadgeDefinition; readonly index: number; readonly clearedDay: number } | null;
};

/** Crimson → lime fill, like the S33 hero bar. */
const GradientFill = ({ pct }: { pct: number }) => (
  <View style={[styles.fill, { width: `${pct}%` }]}>
    <Svg width="100%" height="100%" viewBox="0 0 100 8" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="rankBar" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color.streakFire} />
          <Stop offset="1" stopColor={color.primaryFixed} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={8} fill="url(#rankBar)" />
    </Svg>
  </View>
);

/** Soft crimson bloom in the top-right corner of the S33 hero. */
const Bloom = () => (
  <View pointerEvents="none" style={[sx("absolute"), styles.glow]}>
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id="rankBloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color.streakFire} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color.streakFire} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50%" cy="50%" r="50%" fill="url(#rankBloom)" />
    </Svg>
  </View>
);

/** S33 active streak card with progress toward the active tier. */
export const StreakRankHero = ({ streakCurrent, bestStreak, currentTitle, active }: Props) => {
  const target = active?.def.thresholdDays ?? bestStreak;
  const pct = active && target > 0 ? Math.min(100, Math.round((bestStreak / target) * 100)) : 100;
  const left = Math.max(0, target - bestStreak);

  return (
    <View style={sx("relative overflow-hidden rounded-[28px] border border-surface-container-high bg-surface-container p-5")}>
      <Bloom />
      <View style={sx("flex-row items-center justify-between gap-3")}>
        <View style={sx("min-w-0 flex-1 flex-row items-center gap-3")}>
          <View style={sx("h-14 w-14 items-center justify-center rounded-full border border-streak-fire/40 bg-surface-container-lowest")}>
            <FlameIcon size={28} lit={streakCurrent > 0} />
          </View>
          <View style={sx("min-w-0 flex-1")}>
            <View style={sx("flex-row items-center gap-2")}>
              <Text style={sx("font-display-metric text-headline-lg text-on-surface")}>{streakCurrent}</Text>
              <View style={sx("rounded-sm bg-primary-fixed/15 px-2 py-1")}>
                <CapsLabel tone="lime">{rankCopy.dayStreak}</CapsLabel>
              </View>
            </View>
            <Text style={sx("font-body-md text-body-md text-on-surface-variant")}>
              {active ? rankCopy.heroSub(bestStreak, left, active.def.title) : rankCopy.heroSubDone(bestStreak)}
            </Text>
          </View>
        </View>
        <View style={sx("items-end")}>
          <CapsLabel style={styles.onSurface}>{rankCopy.current}</CapsLabel>
          <Text style={sx("font-headline-md text-headline-md text-secondary")}>{active?.def.title ?? currentTitle ?? rankCopy.unranked}</Text>
        </View>
      </View>

      <View style={sx("mt-5 gap-2")}>
        <View style={sx("flex-row items-center justify-between")}>
          <View style={sx("flex-row items-center gap-1.5")}>
            <View style={sx("h-1.5 w-1.5 rounded-full bg-streak-fire")} />
            <Text style={sx("font-label-md text-label-md text-on-surface-variant")}>
              {active ? rankCopy.heroTier(active.index + 1, active.def.title) : rankCopy.heroDone}
            </Text>
          </View>
          <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>{rankCopy.heroDays(bestStreak, target)}</Text>
        </View>
        <View style={sx("h-2 overflow-hidden rounded-full bg-surface-container-highest")}>
          <GradientFill pct={pct} />
        </View>
        {active ? (
          <View style={sx("mt-1 flex-row items-center justify-between")}>
            <Text style={sx("font-body-md text-body-md text-on-surface-variant")}>{rankCopy.heroCleared(active.clearedDay)}</Text>
            <Text style={sx("font-body-md text-body-md text-on-surface-variant")}>{rankCopy.heroRemaining(left, active.def.title)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  glow: { top: -140, right: -120, width: 360, height: 360 },
  fill: { height: "100%", borderRadius: 4, overflow: "hidden" },
  onSurface: { color: color.onSurface },
});
