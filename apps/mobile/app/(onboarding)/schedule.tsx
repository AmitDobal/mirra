import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  useOnboardingStore,
  type SessionMinutes,
} from "@/features/onboarding";
import { Button, Chip } from "@/ui";
import { sx } from "@/theme/sx";

/** S08 — Training days + session length. */
const ScheduleScreen = () => {
  const c = onboardingCopy.schedule;
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const sessionMinutes = useOnboardingStore((s) => s.sessionMinutes);
  const toggleTrainingDay = useOnboardingStore((s) => s.toggleTrainingDay);
  const setSessionMinutes = useOnboardingStore((s) => s.setSessionMinutes);

  const selectedCount = trainingDays.filter(Boolean).length;
  const weeklyMins = selectedCount * sessionMinutes;

  return (
    <OnboardingShell
      header={<ProgressHeader step={7} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={selectedCount === 0}
          onPress={() => router.push("/(onboarding)/lifestyle")}
        />
      }
    >
      <QuizEyebrow label={c.eyebrow} />
      <Text style={sx("font-headline text-headline-md text-on-surface")}>
        {c.title}
      </Text>
      <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
        {c.sub}
      </Text>

      <View style={sx("mt-space-lg flex-row items-center justify-between")}>
        <Text style={sx("font-label text-label-md text-on-surface-variant")}>
          {c.trainingDays}
        </Text>
        <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>
          {c.daysSelected(selectedCount)}
        </Text>
      </View>

      <View style={sx("mt-space-sm flex-row justify-between")}>
        {c.dayLetters.map((letter, index) => {
          const selected = trainingDays[index];
          return (
            <Pressable
              key={`${letter}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Day ${letter}`}
              accessibilityState={{ selected }}
              onPress={() => toggleTrainingDay(index)}
              style={sx(
                `h-12 w-12 items-center justify-center rounded-full ${
                  selected
                    ? "bg-primary-container"
                    : "bg-surface-container-high"
                }`,
              )}
            >
              <Text
                style={sx(
                  `font-label text-label-lg ${
                    selected ? "text-on-primary-fixed" : "text-on-surface"
                  }`,
                )}
              >
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedCount > 0 ? (
        <Text style={sx("mt-space-sm font-body text-body-sm text-secondary")}>
          {c.recovery}
        </Text>
      ) : null}

      <Text
        style={sx(
          "mt-space-xl font-label text-label-md text-on-surface-variant",
        )}
      >
        {c.sessionLength}
      </Text>
      <View style={sx("mt-space-sm flex-row flex-wrap gap-space-sm")}>
        {c.minutes.map((mins) => (
          <Chip
            key={mins}
            label={`${mins} ${c.minSuffix}`}
            selected={sessionMinutes === mins}
            onPress={() => setSessionMinutes(mins as SessionMinutes)}
          />
        ))}
      </View>
      <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
        {c.sessionNote}
      </Text>
      {selectedCount > 0 ? (
        <View
          style={sx(
            "mt-space-md self-start rounded-full bg-secondary-container px-space-md py-space-xs",
          )}
        >
          <Text style={sx("font-label-bold text-label-md text-on-secondary-container")}>
            {c.targetOutput(weeklyMins)}
          </Text>
        </View>
      ) : null}
    </OnboardingShell>
  );
};

export default ScheduleScreen;
