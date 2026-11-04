/**
 * AMI-177 defense in depth: the funnel may only PUT /v1/onboarding (and regenerate the
 * plan) when the user actually walked the quiz in this app session. Pure, no RN imports
 * (unit-tested with `node --test`).
 */
export type SubmitDecision = "submit" | "reset" | "skip";

export type SubmitInput = {
  /** User pressed Continue on the first quiz screen in this JS session. */
  readonly quizWalked: boolean;
  /** GET /v1/me `onboardingCompleted`; `null` = unknown (guest / offline). */
  readonly serverOnboarded: boolean | null;
  readonly entitled: boolean;
};

/**
 * - `skip`: never write — no quiz this session (stale route, deep link, replayed stack)
 *   or an onboarded, entitled user (their profile + plan are never replaced by the funnel).
 * - `reset`: unpaid user re-ran the quiz after a server write ("edit answers" before paywall).
 * - `submit`: first completion.
 */
export const decideOnboardingSubmit = (opts: SubmitInput): SubmitDecision => {
  if (!opts.quizWalked) return "skip";
  if (opts.serverOnboarded === true) return opts.entitled ? "skip" : "reset";
  return "submit";
};

let quizWalked = false;

/** Call from the first quiz screen's Continue (goal). */
export const markQuizWalked = (): void => {
  quizWalked = true;
};

export const isQuizWalked = (): boolean => quizWalked;

/** Account wipe / sign-out: a new identity must walk the quiz again. */
export const clearQuizWalked = (): void => {
  quizWalked = false;
};
