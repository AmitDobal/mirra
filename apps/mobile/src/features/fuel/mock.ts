export const fuelMock = {
  header: "Calibrated to Alex · Target 1,840 kcal",
  date: "Today, May 18",
  remaining: "620",
  logged: "1,220",
  target: "1,840",
  pct: "66%",
  macros: [
    { name: "Protein", pct: "78%", cur: "110", goal: "140g" },
    { name: "Carbs", pct: "75%", cur: "135", goal: "180g" },
    { name: "Fats", pct: "70%", cur: "42", goal: "60g" },
  ],
  meals: [
    {
      id: "b",
      slot: "Breakfast",
      time: "08:15 AM",
      name: "Post-workout Oats & Whey",
      kcal: "480",
      protein: "42g Protein",
      done: true,
    },
    {
      id: "l",
      slot: "Lunch",
      time: "01:20 PM",
      name: "Chicken Bowl & Quinoa",
      kcal: "740",
      protein: "58g Protein",
      done: true,
    },
    {
      id: "d",
      slot: "Dinner",
      time: "Recommended",
      name: "Salmon & Sweet Potato",
      kcal: "520",
      protein: "40g P target",
      done: false,
    },
  ],
  water: { logged: "2.1L", goal: "3.0L" },
} as const;

export const logMealMock = {
  confidence: "AI Scanned 98%",
  name: "Energy Density",
  kcal: "620",
  goalPct: "31% Goal",
  macros: [
    { name: "Protein", g: "54", pct: "35% cal" },
    { name: "Carbs", g: "65", pct: "42% cal" },
    { name: "Fats", g: "18", pct: "23% cal" },
  ],
  note: "Perfect anabolic balance. Leaves 28g protein remaining for your post-workout evening micro-window.",
  adds: [
    { name: "Whey Shake", meta: "25g P" },
    { name: "2 Large Eggs", meta: "12g P" },
    { name: "Greek Yogurt", meta: "18g P" },
  ],
} as const;
