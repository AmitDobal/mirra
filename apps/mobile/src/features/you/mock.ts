export const youMock = {
  name: "Alex Chen",
  handle: "@alexchen · Member since Feb 2024",
  plan: "Pro Annual · Renews Feb 2025",
  protocol: "Cycle 08 · Wk 3",
  protocolTitle: "Hypertrophy & Athletic Taper",
  protocolBody: "Calibrated for dynamic explosiveness with structured volume taper.",
  pace: "4 lifts / week · 45 min target",
  macros: "1,840 kcal · 140g Protein floor",
  locations: [
    { id: "gym", title: "Commercial Gym", detail: "Olympic racks, Cables, Benches, Leg Press", active: true },
    { id: "home", title: "Home Minimal", detail: "Adjustable DBs (5-50lb), Pull-up bar, Bands", active: false },
    { id: "hotel", title: "Hotel & Bodyweight", detail: "Calisthenics, Tempo control, Micro-bands", active: false },
  ],
  toggles: [
    { id: "rebuild", title: "Adaptive Rebuild", detail: "Redistributes missed sets across microcycle", on: true },
    { id: "rest", title: "Rest Day Aggressiveness", detail: "HRV + Load auto-trigger · Balanced 48h", on: true },
    { id: "voice", title: "Voice Coaching HUD", detail: "Real-time tempo cadences · Minimal Cues", on: false },
  ],
  hardware: [
    { title: "Apple Health / Watch", meta: "Synced" },
    { title: "Withings Body Scan", meta: "Ready" },
    { title: "USDA & Vision Scanner", meta: "Ready" },
  ],
  version: "Mirra Engine · v2.4.1 (Build 412)",
} as const;
