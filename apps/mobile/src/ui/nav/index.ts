import { Platform } from "react-native";

import { stackTransition, type TransitionKind } from "./transitions";

export { stackTransition, type StackTransition, type TransitionKind } from "./transitions";
export { TabsStack } from "./TabsStack";
export { useColdBackFallback } from "./use-cold-back";

/** Stack options for this device. */
export const transition = (kind: TransitionKind) => stackTransition(kind, Platform.OS);
