import { router } from "expo-router";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  SelectRow,
  useOnboardingStore,
} from "@/features/onboarding";
import { Button } from "@/ui";

/** S03 — Main goal single-select. */
const GoalScreen = () => {
  const c = onboardingCopy.goal;
  const goal = useOnboardingStore((s) => s.goal);
  const setGoal = useOnboardingStore((s) => s.setGoal);

  const handleBack = () => router.back();
  const handleContinue = () => {
    if (!goal) return;
    router.push("/(onboarding)/experience");
  };

  return (
    <OnboardingShell
      header={<ProgressHeader step={1} onBack={handleBack} />}
      footer={
        <Button
          label={c.continue}
          disabled={!goal}
          onPress={handleContinue}
        />
      }
    >
      <View className="mt-space-lg gap-space-sm">
        <Text className="font-headline text-headline-md text-on-surface">
          {c.title}
        </Text>
        <Text className="font-body text-body-sm text-on-surface-variant">
          {c.hint}
        </Text>
      </View>
      <View className="mt-space-lg gap-space-sm">
        {c.options.map((opt) => (
          <SelectRow
            key={opt.id}
            label={opt.label}
            selected={goal === opt.id}
            onPress={() => setGoal(opt.id)}
          />
        ))}
      </View>
    </OnboardingShell>
  );
};

export default GoalScreen;
