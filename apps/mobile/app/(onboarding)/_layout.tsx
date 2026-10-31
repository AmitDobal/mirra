import { Stack } from "expo-router";

import { color } from "@/theme/tokens";

const OnboardingLayout = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: color.background },
      animation: "default",
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="splash" />
    <Stack.Screen name="welcome" />
    <Stack.Screen name="goal" />
    <Stack.Screen name="experience" />
    <Stack.Screen name="body-stats" />
    <Stack.Screen name="target" />
    <Stack.Screen name="physique" />
    <Stack.Screen name="equipment" />
    <Stack.Screen name="schedule" />
    <Stack.Screen name="lifestyle" />
    <Stack.Screen name="diet" />
    <Stack.Screen name="cuisine" />
    <Stack.Screen name="trainer" />
    <Stack.Screen name="mirror" />
    <Stack.Screen name="generating" />
    <Stack.Screen name="week-reveal" />
    <Stack.Screen name="paywall" />
    <Stack.Screen name="auth" />
  </Stack>
);

export default OnboardingLayout;
