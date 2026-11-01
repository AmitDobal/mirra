/** `__DEV__`-only: user tapped "Continue without Pro" so the tab guard lets them in. */
let skipped = false;

export const markPaywallSoftSkipped = (): void => {
  skipped = __DEV__;
};

export const isPaywallSoftSkipped = (): boolean => __DEV__ && skipped;

export const resetPaywallSoftSkip = (): void => {
  skipped = false;
};
