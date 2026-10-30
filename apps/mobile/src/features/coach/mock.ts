export const coachMock = {
  date: "Thu, May 19",
  status: "Sync Engine v2.4 · Ready",
  title: "High Adaptation",
  body: "Life happens. Zero guilt. You rested through yesterday's Upper Body Intensity. Your streak remains 100% active. Let's balance the load.",
  week: "Microcycle Week 12",
  balance: "In Balance",
  workouts: "2/4",
  deficit: "1,220",
  vectors: [
    {
      id: "missed",
      title: "Missed Session Recalibration",
      recommended: true,
      detail: "Redistribute missed volume across remaining microcycle days.",
    },
    {
      id: "deload",
      title: "Deload / Low Readiness",
      recommended: false,
      detail: "Drop load to 65% 1RM and swap high-strain compounds for active flow.",
    },
    {
      id: "express",
      title: "20-Min Express Compression",
      recommended: false,
      detail: "High-density supersets preserving top compound mechanics.",
    },
  ],
  proposal:
    "Mirra dynamically shifted 4 sets Incline DB Press and Lateral Raises into today's warm finish.",
} as const;

export const rebuildMock = {
  badge: "Zero Guilt Shift · 100% Volume",
  title: "Your week, re-calibrated.",
  stimulus: "Optimal",
  metrics: [
    { label: "Total Vol", value: "8.4k", meta: "100% Match" },
    { label: "Burn Target", value: "1,840", meta: "Balanced" },
    { label: "Recovery", value: "36h", meta: "Safe Gap" },
  ],
  days: [
    { day: "Thu", tag: "Today", title: "Active Mobility & Core", meta: "20 min · Low CNS" },
    { day: "Fri", tag: "Day 2", title: "Upper Push/Pull Hybrid", meta: "50 min · +2 Chest sets" },
    { day: "Sat", tag: "Day 3", title: "Posterior & Compound Lift", meta: "45 min" },
    { day: "Sun", tag: "Rest", title: "Complete Reset & Re-feed", meta: "Glycogen recharge" },
  ],
} as const;
