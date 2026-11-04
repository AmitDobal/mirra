/**
 * Native stack transitions, one place for every layout (AMI-175). No fades:
 * - push: iOS system slide (edge-swipe back); Android iOS-style slide from right.
 * - root: mode switches (boot gate → funnel / tabs) swap with no animation.
 * - tabRoot: dock tab switches are instant, never a fade flash.
 * - session: live workout covers the app, sliding up from the bottom.
 * Pure (no RN import) so node tests can check it per platform.
 */
export type TransitionOs = "ios" | "android" | "web" | "windows" | "macos";

export type TransitionKind = "push" | "root" | "tabRoot" | "session";

export type StackTransition = {
  readonly animation:
    | "default"
    | "ios_from_right"
    | "none"
    | "slide_from_bottom";
  readonly gestureEnabled: boolean;
  readonly presentation?: "card" | "fullScreenModal";
  /** Android back/forward feel matches iOS pop. */
  readonly animationTypeForReplace?: "push" | "pop";
};

export const stackTransition = (kind: TransitionKind, os: TransitionOs): StackTransition => {
  switch (kind) {
    case "root":
    case "tabRoot":
      return { animation: "none", gestureEnabled: false };
    case "session":
      return {
        animation: "slide_from_bottom",
        presentation: "fullScreenModal",
        gestureEnabled: false,
      };
    case "push":
      return {
        animation: os === "android" ? "ios_from_right" : "default",
        gestureEnabled: true,
        animationTypeForReplace: "push",
      };
  }
};
