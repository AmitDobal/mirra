import { devTesterAllowed } from "./dev-tester";

/** Dev / day-test only: user tapped "Continue without Pro" so the tab guard lets them in. */
let skipped = false;

export const markPaywallSoftSkipped = (): void => {
  skipped = devTesterAllowed();
};

export const isPaywallSoftSkipped = (): boolean => devTesterAllowed() && skipped;

export const resetPaywallSoftSkip = (): void => {
  skipped = false;
};
