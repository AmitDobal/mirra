export const progressMock = {
  cycle: "Microcycle 12 · 8W Active",
  delta: "Shape Evolution · -3.4% Est. BF",
  baseline: "Week 1 (Mar 24)",
  current: "Week 12 (Today)",
  stats: [
    { label: "Lean Mass", value: "+3.2", unit: "kg added" },
    { label: "Waist Delta", value: "-1.8", unit: "in tapered" },
    { label: "Logging", value: "94%", unit: "Check-in rate" },
  ],
  entries: [
    { id: "1", when: "May 18 (Today)", note: "Upper V-Taper focus · Post AM", kg: "77.4", bf: "11.8%" },
    { id: "2", when: "Apr 20 (Week 8)", note: "Mid-phase hypertrophy · Peak delts", kg: "78.1", bf: "12.9%" },
    { id: "3", when: "Mar 23 (Week 4)", note: "Foundation calibration · Post deload", kg: "79.0", bf: "13.8%" },
    { id: "4", when: "Feb 24 (Week 1)", note: "Baseline Day 1 · Starting scan", kg: "79.8", bf: "15.2%" },
  ],
} as const;

export const compareMock = {
  title: "Week 1 Baseline vs. Week 12 Today",
  days: "84 Days Delta",
  views: ["Front View", "Side Profile", "Back Lat"] as const,
  metrics: [
    { label: "Thoracic Posture", detail: "Scapular retraction & spine elevation", value: "+12°", tag: "Correction" },
    { label: "Shoulder-to-Waist", detail: "V-Taper progression & lat fullness", value: "+4.8%", tag: "Expansion" },
    { label: "Midsection Density", detail: "Lateral oblique firmness index", value: "-6.2mm", tag: "Subcutaneous" },
  ],
  consistency: "88",
  symmetry: "94",
} as const;
