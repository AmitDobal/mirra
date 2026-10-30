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

/** S04 — Training experience. */
const ExperienceScreen = () => {
  const c = onboardingCopy.experience;
  const experience = useOnboardingStore((s) => s.experience);
  const setExperience = useOnboardingStore((s) => s.setExperience);

  const handleBack = () => router.back();
  const handleContinue = () => {
    if (!experience) return;
    router.push("/(onboarding)/body-stats");
  };

  return (
    <OnboardingShell
      header={<ProgressHeader step={2} onBack={handleBack} />}
      footer={
        <Button
          label={c.continue}
          disabled={!experience}
          onPress={handleContinue}
        />
      }
    >
      <Text className="mt-space-lg font-headline text-headline-md text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-lg gap-space-sm">
        {c.options.map((opt) => (
          <SelectRow
            key={opt.id}
            label={opt.label}
            hint={opt.hint}
            selected={experience === opt.id}
            onPress={() => setExperience(opt.id)}
          />
        ))}
      </View>
    </OnboardingShell>
  );
};

export default ExperienceScreen;
