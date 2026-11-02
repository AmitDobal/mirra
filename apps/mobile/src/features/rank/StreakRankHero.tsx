import { Text, View } from "react-native";

import { FlameIcon } from "@/features/today/FlameIcon";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly streakCurrent: number;
  readonly bestStreak: number;
  readonly currentTitle: string | null;
  readonly nextTitle: string | null;
  readonly progress: { current: number; target: number; label: string } | null;
};

/** S33 active streak card with progress toward next tier. */
export const StreakRankHero = ({ streakCurrent, bestStreak, currentTitle, nextTitle, progress }: Props) => {
  const pct =
    progress && progress.target > 0
      ? Math.min(100, Math.round((progress.current / progress.target) * 100))
      : 100;

  return (
    <View style={sx("relative overflow-hidden rounded-lg border border-surface-container-high bg-surface-container p-4")}>
      <View style={sx("flex-row items-center justify-between gap-3")}>
        <View style={sx("flex-row items-center gap-3")}>
          <View style={sx("h-12 w-12 items-center justify-center rounded-full border border-streak-fire/40 bg-surface-container-lowest p-2")}>
            <FlameIcon size={28} lit />
          </View>
          <View>
            <View style={sx("flex-row items-center gap-2")}>
              <Text style={sx("font-headline-md text-headline-md text-on-surface")}>{streakCurrent}</Text>
              <CapsLabel tone="muted">Day streak</CapsLabel>
            </View>
            <Text style={sx("font-body-sm text-body-sm text-on-surface-variant")}>
              Best {bestStreak}
              {nextTitle ? ` · ${Math.max(0, (progress?.target ?? 0) - bestStreak)} days to ${nextTitle}` : ""}
            </Text>
          </View>
        </View>
        <View style={sx("items-end")}>
          <CapsLabel tone="muted">Current</CapsLabel>
          <Text style={sx("font-headline-sm text-headline-sm text-on-secondary-container")}>
            {currentTitle ?? "—"}
          </Text>
        </View>
      </View>

      {progress ? (
        <View style={sx("mt-4 gap-2")}>
          <View style={sx("flex-row items-center justify-between")}>
            <Text style={sx("font-label-md text-label-md text-on-surface")}>
              {currentTitle ? `${currentTitle} (active)` : "Working toward Spark"}
            </Text>
            <Text style={sx("font-label-md text-label-md text-primary-fixed")}>{progress.label}</Text>
          </View>
          <View style={sx("h-2 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container-lowest p-px")}>
            <View
              style={[
                sx("h-full rounded-full bg-streak-fire"),
                { width: `${pct}%`, backgroundColor: color.streakFire },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};
