/**
 * Onboarding stack order (pure; `_layout.tsx` registers screens in this order and a test
 * keeps them in sync). AMI-180 inserts S43 `timeline` between week-reveal and paywall/auth.
 */
export const ONBOARDING_SCREENS = [
  "splash",
  "welcome",
  "goal",
  "experience",
  "body-stats",
  "target",
  "physique",
  "equipment",
  "schedule",
  "lifestyle",
  "diet",
  "cuisine",
  "trainer",
  "mirror",
  "generating",
  "week-reveal",
  "timeline",
  "paywall",
  "auth",
] as const;

export type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number];

/** Primary CTA of S12 week reveal → S43 (then auth / paywall via `handleWeekRevealStart`). */
export const AFTER_WEEK_REVEAL = "/(onboarding)/timeline" as const;
