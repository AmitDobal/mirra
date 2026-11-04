import { Check, CircleDashed, Lock, Timer } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { rankCopy } from "@/content/rank";
import type { BadgeDefinition } from "@/lib/api/badges";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import { RankGlyph } from "./RankGlyph";
import { rankVisualFor, type TierState } from "./rank-meta";

type Props = {
  readonly def: BadgeDefinition;
  readonly state: TierState;
  readonly bestStreak: number;
  readonly isTop: boolean;
};

const CARD: Record<TierState, string> = {
  unlocked: "border-outline-variant/30 bg-surface-container-low",
  active: "border-streak-fire/70 bg-surface-container",
  progress: "border-outline-variant/30 bg-surface-container-low",
  locked: "border-surface-container-high/60 bg-surface-container-lowest opacity-40",
};

const Pill = ({ state, def, best, isTop }: { state: TierState; def: BadgeDefinition; best: number; isTop: boolean }) => {
  if (state === "unlocked") {
    return (
      <View style={sx("rounded-full border border-primary-fixed/70 px-[10px] py-1")}>
        <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>{rankCopy.pillUnlocked(def.thresholdDays)}</Text>
      </View>
    );
  }
  if (state === "active") {
    return (
      <View style={sx("rounded-full border border-streak-fire/60 bg-streak-fire/15 px-[10px] py-1")}>
        <Text style={sx("font-label-bold text-label-md text-streak-fire")}>{rankCopy.pillActive}</Text>
      </View>
    );
  }
  if (state === "progress") {
    return (
      <View style={sx("rounded-full border border-outline-variant bg-surface-container-high px-[10px] py-1")}>
        <Text style={sx("font-label-bold text-label-md text-on-surface-variant")}>
          {rankCopy.pillProgress(best, def.thresholdDays)}
        </Text>
      </View>
    );
  }
  return (
    <View style={sx("flex-row items-center gap-1 py-1")}>
      {isTop ? null : <Lock size={12} color={color.onSurfaceVariant} />}
      <Text style={sx("font-label-bold text-label-md text-on-surface-variant")}>
        {isTop ? rankCopy.pillTopLocked(def.title) : rankCopy.pillLocked}
      </Text>
    </View>
  );
};

const Badge = ({ state }: { state: TierState }) => {
  if (state === "unlocked") {
    return (
      <View style={[sx("absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-surface-container-low bg-primary-fixed"), styles.ring]}>
        <Check size={11} color={color.onPrimaryFixed} strokeWidth={3} />
      </View>
    );
  }
  if (state === "active") {
    return <View style={[sx("absolute top-0 right-0 h-3 w-3 rounded-full border-surface-container bg-streak-fire"), styles.ring]} />;
  }
  if (state === "progress") {
    return (
      <View style={sx("absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-primary-fixed/60 bg-surface-container-high")}>
        <CircleDashed size={11} color={color.primaryFixed} />
      </View>
    );
  }
  return (
    <View style={sx("absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high")}>
      <Lock size={10} color={color.onSurfaceVariant} />
    </View>
  );
};

const subLine = (state: TierState, days: number): string => {
  if (state === "active") return rankCopy.daysMilestone(days);
  if (state === "locked" || state === "progress") return rankCopy.days(days);
  return rankCopy.daysLocked(days);
};

/** One milestone row on the S33 vertical ladder. */
export const RankTierRow = ({ def, state, bestStreak, isTop }: Props) => {
  const active = state === "active";
  const { icon, blurb } = rankVisualFor(def.id);
  const left = Math.max(0, def.thresholdDays - bestStreak);
  const done = bestStreak >= def.thresholdDays;

  return (
    <View style={[sx(`flex-row gap-space-md rounded-[28px] border p-4 ${CARD[state]}`), active ? styles.activeCard : null]}>
      <View
        style={[
          sx(
            `relative h-12 w-12 items-center justify-center rounded-full ${
              active ? "border-streak-fire bg-surface-container-lowest" : "border-outline-variant bg-surface-container-high"
            }`,
          ),
          styles.ring,
        ]}
      >
        <RankGlyph icon={icon} size={20} tint={state === "locked" ? color.onSurfaceVariant : color.onSurface} dim={state === "locked"} />
        <Badge state={state} />
      </View>
      <View style={sx("min-w-0 flex-1")}>
        <View style={sx("flex-row items-start justify-between gap-2")}>
          <View style={sx("min-w-0 flex-1")}>
            <View style={sx("flex-row items-center gap-1.5")}>
              <Text style={sx("font-headline-md text-headline-md text-on-surface")}>{def.title}</Text>
              {active ? <View style={sx("h-2 w-2 rounded-full bg-streak-fire")} /> : null}
            </View>
            <Text style={sx(`mt-1 font-label-bold text-label-md ${active ? "text-streak-fire" : "text-on-surface-variant"}`)}>
              {subLine(state, def.thresholdDays)}
            </Text>
          </View>
          <View style={sx("mt-1")}>
            <Pill state={state} def={def} best={bestStreak} isTop={isTop} />
          </View>
        </View>
        <Text style={sx("mt-2 font-body-md text-body-md text-on-surface-variant")}>{blurb}</Text>
        {active && !done ? (
          <View style={sx("mt-3 flex-row items-center gap-2 border-t border-outline-variant/30 pt-3")}>
            <Timer size={16} color={color.primaryFixed} />
            <Text style={sx("min-w-0 flex-1 font-label-bold text-label-lg text-on-surface")}>
              {rankCopy.toComplete(left, def.title)}
            </Text>
            <Text style={sx("font-label-bold text-label-lg text-primary-fixed")}>
              {rankCopy.bestOf(bestStreak, def.thresholdDays)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ring: { borderWidth: 2 },
  activeCard: {
    borderWidth: 2,
    shadowColor: color.streakFire,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
