import { Stack } from "expo-router";

import { color } from "@/theme/tokens";
import { transition } from "@/ui/nav";

/** S16–S17 session stack (no TabDock). */
const WorkoutLayout = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: color.background },
      // The group itself slides up as a full-screen modal (root `_layout`);
      // live → complete is an in-session push.
      ...transition("push"),
    }}
  />
);

export default WorkoutLayout;
