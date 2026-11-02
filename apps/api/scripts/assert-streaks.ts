/**
 * Offline assertions for streak math (no DB).
 *   npm run test:streaks -w @mirra/api
 */
import { computeStreak, viewStreak } from "../src/lib/streak-math";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const T = "2026-11-02";

check(computeStreak([], T).current === 0, "no check-ins = 0");
check(computeStreak(["2026-11-02"], T).current === 1, "today only = 1");
check(computeStreak(["2026-11-01"], T).current === 1, "yesterday only keeps streak alive (1)");
check(computeStreak(["2026-10-31"], T).current === 0, "gap of a day breaks the streak");
check(
  computeStreak(["2026-11-02", "2026-11-01", "2026-10-31", "2026-10-29"], T).current === 3,
  "3-day run, older island ignored",
);
check(computeStreak(["2026-11-03"], T).current === 0, "future dates never count");
check(
  computeStreak(["2026-11-03", "2026-11-02"], T).lastActiveDate === "2026-11-02",
  "lastActiveDate ignores future",
);
check(
  computeStreak(["2026-10-31", "2026-11-01"], T).lastActiveDate === "2026-11-01",
  "lastActiveDate = latest counted day",
);

const row = (currentCount: number, lastActiveDate: string | null) => ({
  currentCount,
  bestCount: 9,
  lastActiveDate,
});
check(viewStreak(row(4, T), T).fire === "lit", "counted today = lit");
check(viewStreak(row(4, "2026-11-01"), T).fire === "at_risk", "last = yesterday = at_risk");
check(viewStreak(row(4, "2026-11-01"), T).current === 4, "at_risk keeps count");
const broken = viewStreak(row(4, "2026-10-30"), T);
check(broken.fire === "cold" && broken.current === 0, "older than yesterday = cold, 0");
check(viewStreak(row(0, null), T).fire === "cold", "never started = cold");

if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log("PASS streaks");
