/** Plan chat copy (Stitch S28 / S39). Screens import labels, never hardcode strings. */
export const planChatCopy = {
  /** S39 top bar + chat chrome. */
  title: "Plan chat",
  coachInitial: "M",
  composer: {
    placeholder: "e.g. no cable machines, prefer bench press",
    locked: "Reply after you decide…",
    inputLabel: "Message your coach",
    send: "Send message",
    mic: "Dictate a message",
    micHint: "Opens the keyboard. Tap the keyboard mic to dictate.",
  },
  preparing: "Preparing your preview…",
  /** Coach line on a preview (S39): nothing is applied until "Yes, apply". */
  preview: "Here is the change. Nothing updates until you apply.",
  welcome:
    "Tell me what to change: equipment you don't have, lifts you prefer, foods to avoid, or a shorter session. I'll show you the change first. Nothing updates until you say yes.",
  card: {
    title: "Proposed changes",
    caption: {
      pending: "READY TO APPLY",
      applied: "APPLIED TO YOUR PLAN",
      dismissed: "NOT APPLIED",
      stale: "NO LONGER VALID",
    },
    prompt: "Apply these to your plan?",
    change: "Change it",
    apply: "Yes, apply",
    applying: "Applying…",
  },
  sections: {
    workout: "WORKOUT REVISION",
    meal: "MEAL ADJUSTMENT",
    schedule: "SCHEDULE",
    prefs: "PLAN PREFERENCES",
  },
  row: {
    before: "Before: ",
    after: "After: ",
    add: "Add: ",
    remove: "Remove: ",
    reason: "↳ ",
    session: "Session",
    mealsPerDay: (n: number) => `${n} ${n === 1 ? "meal" : "meals"} a day`,
    removed: "removed",
  },
  slot: {
    breakfast: "Breakfast",
    lunch: "Lunch",
    snack: "Snack",
    dinner: "Dinner",
  },
  reply: {
    applied: "Done. Your plan is updated.",
    nothingToApply: "Nothing needed changing anymore, so your plan stays as is.",
    dismissed: "No problem. Nothing changed. Tell me what you'd like instead.",
    planChanged: "Your plan changed. Send that again?",
    draftGone: "That preview expired. Send it again.",
  },
  error: {
    limit: "Plan chat limit reached for today.",
    vague: "Say a bit more so I can change your plan.",
    offline: "Couldn't reach the coach. Try again.",
  },
} as const;
