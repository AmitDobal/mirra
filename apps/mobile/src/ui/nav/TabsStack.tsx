import { Stack } from "expo-router";
import { Platform } from "react-native";

import { color } from "@/theme/tokens";

import { stackTransition } from "./transitions";

/** Dock destinations: swapped in place (TabDock `replace`), never animated. */
const TAB_ROOTS = ["today", "exercise", "fuel", "progress", "you"] as const;

const push = stackTransition("push", Platform.OS);
const tabRoot = stackTransition("tabRoot", Platform.OS);

/**
 * Native stack for the `(tabs)` group (AMI-175). Detail routes (exercise-detail,
 * history, compare, plan-chat, alerts, …) slide in with edge-swipe back.
 */
export const TabsStack = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: color.background },
      ...push,
    }}
  >
    {TAB_ROOTS.map((name) => (
      <Stack.Screen key={name} name={name} options={tabRoot} />
    ))}
  </Stack>
);
