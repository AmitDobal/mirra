/**
 * Goal timeline copy (AMI-180 onboarding; AMI-182 adds the Goal screen section).
 * Honest-copy rules (`docs/03-engineering/goal-timeline.md` §7): "around <date>",
 * range next to every date, "estimate", never "guaranteed" / "will".
 */

export const goalCopy = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  perWeek: "/ week",
  chart: {
    today: (w: string) => `Today ${w}`,
    goal: (w: string) => `Goal ${w}`,
    a11y: (from: string, to: string, date: string | null) =>
      date ? `Projected weight from ${from} to ${to}, around ${date}` : `Projected weight from ${from}`,
  },
  /** S12 week reveal outcome line: "At this pace, ~7 kg by around Mar 6". */
  weekReveal: {
    lead: "At this pace, ",
    amount: (w: string) => `~${w}`,
    tail: (date: string) => ` by around ${date}`,
  },
  onboarding: {
    title: "Your timeline",
    backLabel: "Back to your week",
    eyebrow: "Based on your answers",
    headlineEta: (pair: string, date: string) => `${pair},\naround ${date}`,
    headlineHorizon: (w: string) => `${w} today,\nyour next 12 weeks`,
    headlineHold: (goal: string, w: string) => `${goal},\nholding ${w}`,
    subEta:
      "If you follow your plan, this is roughly when you get there. Mirra updates it every time you log your weight.",
    subHorizon:
      "No goal weight yet, so this shows where your pace leads in 12 weeks. Set one any time.",
    subHold:
      "Your weight should hold steady while your training does the work. Mirra tracks it as you log.",
    chartTitle: "Projected weight",
    paceLine: (pace: string, rate: string) => `${pace} · ${rate}`,
    holdLine: "Hold",
    stats: {
      expected: "Expected",
      range: "Range",
      weeks: "Weeks",
      inTwelve: "In 12 wk",
      band: "Band",
      next: "Next",
    },
    milestonesTitle: "Milestones",
    firstChange: "First visible change",
    firstChangeDetail: (delta: string) => `Often around here · ${delta}`,
    pickedTitle: "What you picked",
    picked: {
      goal: "Goal",
      weight: "Weight",
      pace: "Pace",
      training: "Training",
      experience: "Experience",
      fuel: "Daily fuel",
    },
    trainingValue: (days: number, mins: number) => `${days} ${days === 1 ? "day" : "days"} · ${mins} min`,
    fuelValue: (kcal: string, protein: number | null) =>
      protein ? `${kcal} kcal · ${protein} g protein` : `${kcal} kcal`,
    noGoalWeight: "No goal weight",
    editAnswers: "Edit answers",
    whatIf: (n: number, date: string) => `Hit ${n} of ${n} sessions every week: around ${date}.`,
    commitLine: (n: number) => `I commit to my ${n} ${n === 1 ? "session" : "sessions"} this week.`,
    hold: "Hold to commit",
    holdA11y: "Hold to commit to your sessions this week",
    holdA11yHint: "Press and hold, or double tap to commit",
    notNow: "Not now",
    disclaimer: "Estimate based on your pace and plan. Not medical advice.",
    flags: {
      direction_mismatch: (down: boolean) =>
        down
          ? "Your goal weight is below today's weight, so the timeline shows a cut."
          : "Your goal weight is above today's weight, so the timeline shows a gain.",
      minor_pace: "Under 18, Mirra keeps the steady pace.",
      target_below_healthy: (w: string) => `We aimed at ${w}, the lowest healthy weight for your height.`,
      kcal_floor: "Mirra slowed the pace so your daily fuel stays above a safe minimum.",
      beyond_horizon: "More than 2 years at this pace. Set a nearer milestone.",
    },
  },
} as const;
