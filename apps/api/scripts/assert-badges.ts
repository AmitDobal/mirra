/**
 * Offline kinetic rank helpers (no DB).
 *   npm run test:badges -w @mirra/api
 */
import {
  currentRankIdForBest,
  nextRankIdForBest,
  parseStreakGteRule,
} from "../src/lib/kinetic-ranks";

const tiers = [
  { id: "rank_spark", threshold: 7 },
  { id: "rank_ember", threshold: 14 },
  { id: "rank_forge", threshold: 30 },
  { id: "rank_volt", threshold: 60 },
  { id: "rank_apex", threshold: 100 },
];

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

check(parseStreakGteRule('{"type":"streak_gte","n":7}') === 7, "parse streak_gte rule");
check(currentRankIdForBest(tiers, 0) === null, "best 0 → no rank");
check(currentRankIdForBest(tiers, 7) === "rank_spark", "best 7 → Spark");
check(currentRankIdForBest(tiers, 13) === "rank_spark", "best 13 still Spark");
check(currentRankIdForBest(tiers, 100) === "rank_apex", "best 100 → Apex");
check(nextRankIdForBest(tiers, 0) === "rank_spark", "next from 0 is Spark");
check(nextRankIdForBest(tiers, 7) === "rank_ember", "next from 7 is Ember");
check(nextRankIdForBest(tiers, 100) === null, "Apex has no next");

if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log("PASS badges");
