export const liveMock = {
  kcal: "328",
  bpm: "148",
  exerciseIndex: "Exercise 1 of 6",
  category: "Cardio + Power",
  name: "Barbell Back Squat",
  elapsed: "04:30",
  rest: "01:30",
  set: 2,
  totalSets: 5,
  load: "100 KG × 8 REPS",
  sets: [
    { n: 1, load: "100kg", done: true },
    { n: 2, load: "100kg", done: false },
    { n: 3, load: "100kg", done: false },
    { n: 4, load: "105kg", done: false },
    { n: 5, load: "105kg", done: false },
  ],
} as const;

export const completeMock = {
  title: "Upper Strength",
  subtitle: "microcycle completed.",
  kcal: "412",
  cycle: "Cycle 04 · Week 2",
  minutes: "42",
  volume: "8.4k",
  exercises: "06",
  hit: "94%",
  recovery: "48 hours",
  next: "Next lift scheduled for Friday, 08:30 AM.",
} as const;
