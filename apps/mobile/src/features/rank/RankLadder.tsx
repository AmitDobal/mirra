import { StyleSheet, View } from "react-native";

import type { BadgeDefinition } from "@/lib/api/badges";
import { color } from "@/theme/tokens";

import { ladderRows, type TierState } from "./rank-meta";
import { RankTierRow } from "./RankTierRow";

type Props = {
  readonly definitions: readonly BadgeDefinition[];
  readonly bestStreak: number;
};

/** Connector below a row takes that row's state color (S33: lime after cleared tiers, crimson after the active one). */
const LINE: Record<TierState, string> = {
  unlocked: color.primaryFixedDim,
  active: color.streakFire,
  progress: color.streakFireDeep,
  locked: color.outlineVariant,
};

/** S33 vertical milestone ladder: Spark at the top, Apex at the bottom, joined by a left rail. */
export const RankLadder = ({ definitions, bestStreak }: Props) => {
  const rows = ladderRows(definitions, bestStreak);
  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.def.id}>
          <RankTierRow def={row.def} state={row.state} bestStreak={bestStreak} isTop={row.isTop} />
          {i < rows.length - 1 ? <View style={[styles.rail, { backgroundColor: LINE[row.state] }]} /> : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  /** Sits in the 16pt gap, under the 48pt glyph column (card padding 16 + 24 − 1). */
  rail: { width: 2, height: 16, marginLeft: 39 },
});
