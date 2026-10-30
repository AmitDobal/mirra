export const todayMock = {
  phase: "Week 12 · Phase 1",
  month: "May 2024",
  days: [
    { d: 16, active: false },
    { d: 17, active: false },
    { d: 18, active: false },
    { d: 19, active: true },
    { d: 20, active: false },
    { d: 21, active: false },
    { d: 22, active: false },
  ],
  focus: {
    title: "Upper Strength",
    subtitle: "Complete morning session before 9:00 AM",
  },
  steps: { value: "1,840", delta: "+14%" },
  pace: { label: "Phase 2", pct: "72%" },
  kcal: { value: "538", tag: "Hypertrophy" },
  routine: {
    title: "Upper Body Hypertrophy",
    meta: "45 mins · 6 movements",
    detail: "Chest press, Barbell overhead press, Cable rows, Lateral raises",
    tags: ["Chest & Triceps", "Deltoids", "Full Gym Rack"],
  },
  fuel: { logged: "1,820", target: "2,400", remaining: "580" },
} as const;
