import { Check, Lock, Target, Zap, Award, Flame } from "lucide-react-native";
import { Text, View } from "react-native";

import type { BadgeDefinition } from "@/lib/api/badges";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import { rankVisualFor } from "./rank-meta";

type Props = {
  readonly def: BadgeDefinition;
  readonly state: "locked" | "unlocked" | "current" | "next";
  readonly bestStreak: number;
};

const IconFor = ({ id, dimmed }: { id: string; dimmed: boolean }) => {
  const { icon } = rankVisualFor(id);
  const tone = dimmed ? color.onSurfaceVariant : color.primaryFixed;
  const size = 20;
  if (icon === "flame") return <Flame size={size} color={dimmed ? color.streakFire : color.streakFire} />;
  if (icon === "forge") return <Zap size={size} color={tone} />;
  if (icon === "volt") return <Target size={size} color={tone} />;
  if (icon === "apex") return <Award size={size} color={tone} />;
  return <Zap size={size} color={tone} />;
};

const statusLabel = (state: Props["state"], def: BadgeDefinition, bestStreak: number): string => {
  if (state === "current") return "Active tier";
  if (state === "unlocked") return `Unlocked · ${def.thresholdDays}d`;
  if (state === "next") return `In progress (${bestStreak}/${def.thresholdDays}d)`;
  return "Locked";
};

/** One milestone row on the S33 vertical ladder. */
export const RankTierRow = ({ def, state, bestStreak }: Props) => {
  const active = state === "current";
  const unlocked = state === "unlocked" || active;
  const dimmed = state === "locked";
  const { blurb } = rankVisualFor(def.id);

  return (
    <View
      style={sx(
        `mb-space-sm flex-row gap-space-md rounded-lg border p-3.5 ${
          active
            ? "border-streak-fire/60 bg-surface-container"
            : dimmed
              ? "border-surface-container-high/40 bg-surface-container-lowest/80 opacity-75"
              : "border-outline-variant/30 bg-surface-container-low"
        }`,
      )}
    >
      <View style={sx("relative h-12 w-12 items-center justify-center rounded-full border-2 border-outline-variant bg-surface-container-high")}>
        <IconFor id={def.id} dimmed={dimmed && !unlocked} />
        {unlocked ? (
          <View style={sx("absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-fixed")}>
            <Check size={12} color={color.onPrimaryFixed} />
          </View>
        ) : (
          <View style={sx("absolute -bottom-1 -right-1 h-4 w-4 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high")}>
            <Lock size={10} color={color.onSurfaceVariant} />
          </View>
        )}
      </View>
      <View style={sx("min-w-0 flex-1")}>
        <View style={sx("mb-1 flex-row items-start justify-between gap-2")}>
          <View style={sx("min-w-0 flex-1")}>
            <Text style={sx(`font-headline-sm text-headline-sm ${active ? "text-on-surface" : "text-on-surface"}`)}>
              {def.title}
            </Text>
            <Text style={sx("font-label-caps text-label-caps text-on-surface-variant")}>
              {def.thresholdDays} Days
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={sx(
              `shrink font-label-caps text-label-caps ${active ? "text-streak-fire" : "text-on-surface-variant"}`,
            )}
          >
            {statusLabel(state, def, bestStreak)}
          </Text>
        </View>
        <Text style={sx("font-body-sm text-body-sm text-on-surface-variant")}>{blurb}</Text>
      </View>
    </View>
  );
};
