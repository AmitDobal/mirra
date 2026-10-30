import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  useOnboardingStore,
  type SessionMinutes,
} from "@/features/onboarding";
import { Button, Chip } from "@/ui";

/** S08 — Training days + session length. */
const ScheduleScreen = () => {
  const c = onboardingCopy.schedule;
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const sessionMinutes = useOnboardingStore((s) => s.sessionMinutes);
  const toggleTrainingDay = useOnboardingStore((s) => s.toggleTrainingDay);
  const setSessionMinutes = useOnboardingStore((s) => s.setSessionMinutes);

  const selectedCount = trainingDays.filter(Boolean).length;

  return (
    <OnboardingShell
      header={<ProgressHeader step={6} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={selectedCount === 0}
          onPress={() => router.push("/(onboarding)/diet")}
        />
      }
    >
      <Text className="mt-space-lg font-headline text-headline-md text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-lg flex-row justify-between">
        {c.dayLetters.map((letter, index) => {
          const selected = trainingDays[index];
          return (
            <Pressable
              key={`${letter}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Day ${letter}`}
              accessibilityState={{ selected }}
              onPress={() => toggleTrainingDay(index)}
              className={`h-12 w-12 items-center justify-center rounded-full ${
                selected
                  ? "bg-primary-container"
                  : "bg-surface-container-high"
              }`}
            >
              <Text
                className={`font-label text-label-lg ${
                  selected ? "text-on-primary-fixed" : "text-on-surface"
                }`}
              >
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-space-xl font-label text-label-md text-on-surface-variant">
        {c.sessionLength}
      </Text>
      <View className="mt-space-sm flex-row flex-wrap gap-space-sm">
        {c.minutes.map((mins) => (
          <Chip
            key={mins}
            label={`${mins} ${c.minSuffix}`}
            selected={sessionMinutes === mins}
            onPress={() => setSessionMinutes(mins as SessionMinutes)}
          />
        ))}
      </View>
    </OnboardingShell>
  );
};

export default ScheduleScreen;
