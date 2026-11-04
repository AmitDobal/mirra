/**
 * Kinetic Rank copy (S33 ladder, S40 Today chip, You teaser).
 * Honest lines only: a tier unlocks a badge, the Today chip title and an alert. Nothing else.
 */

/** What each tier earns, keyed by badge id. */
export const RANK_UNLOCK_COPY: Record<string, string> = {
  rank_spark: "First 7-day check-in streak. Puts the Spark chip on your Today header.",
  rank_ember: "Two straight weeks of check-ins. Your Today chip turns Ember.",
  rank_forge: "A full month without a missed check-in. Earns the Forge badge.",
  rank_volt: "Sixty days locked in. Earns the Volt badge and chip.",
  rank_apex: "One hundred days. The top of the ladder and the Apex badge.",
};

export const rankCopy = {
  headerTitle: "Rank progression",
  eyebrow: "Performance ladder",
  title: "Kinetic Rank",
  intro: "Consistent microcycles forge momentum. Unlock tiers by locking daily adherence.",
  tiersTitle: "Milestone tiers",
  tiersCount: (n: number) => `${n} tiers`,
  dayStreak: "Day streak",
  current: "Current",
  unranked: "Unranked",
  cta: "Keep streak active today",
  teaserEyebrow: "Kinetic rank",
  teaserEmpty: "Start your ladder",
  teaserLine: (best: number) => `Best streak ${best} · Spark → Apex`,

  /** Row pills (S33). */
  pillUnlocked: (day: number) => `Unlocked · Day ${day}`,
  pillActive: "Active tier",
  pillProgress: (best: number, days: number) => `In progress (${best}/${days}d)`,
  pillLocked: "Locked",
  pillTopLocked: (title: string) => `${title} · Locked`,

  /** Row sub-line under the tier name. */
  daysLocked: (days: number) => `${days} days locked`,
  daysMilestone: (days: number) => `${days} days milestone`,
  days: (days: number) => `${days} days`,

  /** Active tier card footer. */
  toComplete: (left: number, title: string) =>
    `${left} ${left === 1 ? "day" : "days"} to complete ${title} milestone`,
  bestOf: (best: number, days: number) => `${best} / ${days}d`,

  /** Hero card. */
  heroSub: (best: number, left: number, title: string) =>
    `Best ${best} · ${left} ${left === 1 ? "day" : "days"} to ${title} unlock`,
  heroSubDone: (best: number) => `Best ${best} · every tier unlocked`,
  heroTier: (tier: number, title: string) => `Tier ${tier} · ${title} (Active)`,
  heroDays: (best: number, days: number) => `${best} / ${days} Days`,
  heroCleared: (day: number) => (day > 0 ? `Day ${day} cleared` : "Day 1 starts it"),
  heroRemaining: (left: number, title: string) => `+${left} days remaining to ${title}`,
  heroDone: "Ladder complete",

  /** Sticky footer. */
  nextMilestone: "Next milestone: ",
  nextMilestoneValue: (title: string, days: number) => `${title} · ${days} days`,
  allUnlocked: "Every tier unlocked. Keep the streak alive.",

  /** Share sheet (header share button). */
  shareTitle: "My Kinetic Rank",
  shareRank: (title: string | null) => (title ? `Kinetic Rank: ${title}` : "Kinetic Rank: climbing to Spark"),
  shareStreak: (current: number, best: number) =>
    `${current}-day check-in streak (best ${best}) on Mirra.`,
  shareNext: (title: string, left: number) => `${left} ${left === 1 ? "day" : "days"} to ${title}.`,
  shareFailed: "Couldn't open the share sheet.",
};
