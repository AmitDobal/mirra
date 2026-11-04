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
  /** S44 Goal screen (AMI-182). */
  screen: {
    title: "Goal",
    back: "Go back",
    more: "More goal options",
    goal: {
      lose_fat: "Lose fat",
      build_muscle: "Build muscle",
      recomp: "Recomp",
      performance: "Get stronger",
      consistency: "Get consistent",
    } as Record<string, string>,
    pace: { steady: "Steady", aggressive: "Aggressive" } as Record<string, string>,
    around: (date: string) => `Around ${date}`,
    range: (range: string) => `Range ${range}`,
    movedUp: (date: string) => `moved up from ${date}`,
    movedBack: (date: string) => `moved from ${date}`,
    noDate: "No date yet",
    noGoalWeight: "No goal weight yet",
    horizonSub: "This shows where your pace leads in 12 weeks. Set a goal weight to get a date.",
    nextHeadline: (label: string) => `Next: ${label}`,
    nextSub: (date: string) => `Around ${date}`,
    status: {
      on_track: "On track",
      ahead: "Ahead",
      behind: "Behind",
      calibrating: "Calibrating",
      no_target: "No target",
    },
    chartTitle: "Weight trend",
    lastWeeks: (n: number) => (n <= 1 ? "This week" : `Last ${n} weeks`),
    legend: { trend: "Trend", weighIns: "Weigh-ins", range: "Estimate range" },
    todayCaps: "Today",
    stats: { start: "Start", now: "Now", toGo: "To go", trend: "7-day trend", soFar: (d: string) => `${d} so far` },
    milestonesTitle: "Milestones",
    firstChange: "First visible change",
    firstChangeDetail: (delta: string) => `Often around here · ${delta}`,
    pct5: "5% of start",
    goalRow: "Goal",
    stayTitle: "Stay on track",
    last28: "Last 28 days",
    rows: { sessions: "Sessions", checkIns: "Check-ins", fuel: "Fuel on target" },
    ratio: (a: number, b: number) => `${a} / ${b}`,
    fuelRatio: (a: number, b: number) => `${a} / ${b} logged days`,
    percent: (r: number) => `${Math.round(r * 100)}%`,
    keep: (n: number, date: string) => `Keep ${n} of ${n} sessions this week to hold ${date}.`,
    keepAny: (date: string) => `Keep your planned sessions this week to hold ${date}.`,
    whatIf: {
      training: (n: number | null, date: string) =>
        n ? `Hit ${n} of ${n} sessions each week: around ${date}.` : `Hit every planned session: around ${date}.`,
      fuel: (date: string) => `Keep fuel on target most days: around ${date}.`,
      check_in: (date: string) => `Check in every day: around ${date}.`,
    },
    behind: (n: number | null) =>
      n
        ? `Next step: get ${n} sessions in this week and log your weight.`
        : "Next step: get your planned sessions in this week and log your weight.",
    calibrating: "Estimate firms up after two weeks of weigh-ins.",
    reversed: (date: string | null) =>
      date
        ? `Your trend moved the other way lately. If you get back on plan: around ${date}.`
        : "Your trend moved the other way lately. Your next sessions and weigh-ins count most.",
    logWeight: "Log weight",
    editGoal: "Edit goal",
    setGoal: "Set a goal weight",
    restart: "Restart from today",
    restartTitle: "Restart your goal?",
    restartBody: "Mirra starts a new timeline from today's trend weight, with the same goal and pace.",
    restartConfirm: "Restart",
    cancel: "Cancel",
    restartLimited: "You already restarted today. Try again tomorrow.",
    restartFailed: "Couldn't restart. Try again.",
    errorTitle: "Couldn't load your goal.",
    retry: "Try again",
    emptyTitle: "No goal yet",
    emptyBody: "Finish onboarding to see your timeline.",
    disclaimer: "Estimate based on your pace, logs and plan. Not medical advice.",
  },
  /** S45 / S46 Goal timeline card (AMI-182). */
  card: {
    title: "Goal timeline",
    a11y: "Open goal timeline",
    pair: (pair: string, pace: string) => `${pair} · ${pace}`,
    sub: (date: string, range: string) => `Around ${date} · range ${range}`,
    noTarget: "Set a goal weight to see a date",
    loading: "Loading your timeline",
  },
} as const;
