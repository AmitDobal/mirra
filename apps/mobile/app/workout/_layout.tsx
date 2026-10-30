import { Stack } from "expo-router";

import { color } from "@/theme/tokens";

/** S16–S17 session stack (no TabDock). */
const WorkoutLayout = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: color.background },
      animation: "slide_from_bottom",
      presentation: "fullScreenModal",
    }}
  />
);

export default WorkoutLayout;
