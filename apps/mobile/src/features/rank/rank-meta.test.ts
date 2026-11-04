import assert from "node:assert/strict";
import { test } from "node:test";

import type { BadgeDefinition, BadgesResponse } from "../../lib/api/badges.ts";
import {
  activeTier,
  earnedRankId,
  ladderRows,
  rankChipModel,
  rankShareMessage,
  unlockedSet,
} from "./rank-meta.ts";

/** AMI-171: tier state comes from the server's unlocked set (`user_badges`), never best streak. */
const def = (id: string, tier: number, title: string, thresholdDays: number): BadgeDefinition => ({
  id, ladder: "kinetic_rank", tier, title, thresholdDays, stitchAssetKey: null,
});
const DEFS = [
  def("rank_ember", 2, "Ember", 14),
  def("rank_spark", 1, "Spark", 7),
  def("rank_forge", 3, "Forge", 30),
  def("rank_volt", 4, "Volt", 60),
  def("rank_apex", 5, "Apex", 100),
];
const ALL = DEFS.map((d) => d.id);
const states = (ids: string[]) => ladderRows(DEFS, new Set(ids)).map((r) => `${r.def.id}:${r.state}`).join();
const response = (ids: string[], bestStreak: number): BadgesResponse => ({
  definitions: DEFS,
  unlocked: ids.map((badgeId) => ({ badgeId, unlockedAt: 0 })),
  bestStreak,
  currentRankId: null,
  nextRankId: null,
});

test("ladder follows the unlocked set, sorted by tier", () => {
  assert.equal(states([]), "rank_spark:active,rank_ember:progress,rank_forge:locked,rank_volt:locked,rank_apex:locked");
  assert.equal(states(["rank_spark"]), "rank_spark:unlocked,rank_ember:active,rank_forge:progress,rank_volt:locked,rank_apex:locked");
  assert.equal(states(ALL), "rank_spark:unlocked,rank_ember:unlocked,rank_forge:unlocked,rank_volt:unlocked,rank_apex:active");
});

test("best streak past a threshold without a badge row stays not unlocked", () => {
  // bestStreak 20 would clear Spark + Ember, but the server only awarded Spark.
  const data = response(["rank_spark"], 20);
  const unlocked = unlockedSet(data.unlocked);
  assert.equal(earnedRankId(DEFS, unlocked), "rank_spark");
  assert.equal(activeTier(DEFS, unlocked)?.def.id, "rank_ember");
  assert.deepEqual(rankChipModel(data), { label: "Spark", locked: false, icon: "bolt" });
});

test("no awarded badge -> locked Spark chip with progress, even when best >= 7", () => {
  assert.deepEqual(rankChipModel(response([], 3)), { label: "Spark 3/7", locked: true, icon: "bolt" });
  assert.deepEqual(rankChipModel(response([], 9)), { label: "Spark 7/7", locked: true, icon: "bolt" });
});

test("complete ladder has no active tier", () => {
  assert.equal(activeTier(DEFS, new Set(ALL)), null);
  assert.equal(earnedRankId(DEFS, new Set(ALL)), "rank_apex");
});

test("share message: earned rank, streak and days to the next tier", () => {
  assert.equal(
    rankShareMessage({
      currentTitle: "Spark",
      streak: 10,
      bestStreak: 10,
      next: { title: "Ember", thresholdDays: 14 },
    }),
    "Kinetic Rank: Spark\n10-day check-in streak (best 10) on Mirra.\n4 days to Ember.",
  );
  assert.equal(
    rankShareMessage({ currentTitle: null, streak: 0, bestStreak: 0, next: null }),
    "Kinetic Rank: climbing to Spark\n0-day check-in streak (best 0) on Mirra.",
  );
});
