import { router } from "expo-router";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell } from "@/features/onboarding";
import { Button, Card } from "@/ui";

/** S02 — Mirror→Week hook. */
const WelcomeScreen = () => {
  const c = onboardingCopy.welcome;

  const handleContinue = () => router.push("/(onboarding)/goal");
  const handleAccount = () => router.push("/(onboarding)/auth");

  return (
    <OnboardingShell
      footer={
        <>
          <Button label={c.continue} onPress={handleContinue} />
          <Button
            label={c.haveAccount}
            variant="ghost"
            onPress={handleAccount}
          />
        </>
      }
    >
      <View className="pt-space-xl">
        <View className="mb-space-md self-start rounded-full bg-primary-container px-space-sm py-1">
          <Text className="font-label-bold text-label-caps text-on-primary-fixed">
            {c.eyebrow}
          </Text>
        </View>
        <Text className="font-headline text-headline-lg text-on-surface">
          {c.titleLine1}
        </Text>
        <Text className="font-headline text-headline-lg text-on-surface">
          {c.titleLine2}
        </Text>
        <Text className="mt-space-sm max-w-[320px] font-body-medium text-body-md text-on-surface-variant">
          {c.sub}
        </Text>
        <Card tone="lavender" className="mt-space-xl gap-space-md p-space-md">
          {c.steps.map((step) => (
            <View key={step.num} className="flex-row items-center gap-space-md">
              <Text className="w-8 font-label text-label-md text-primary-fixed">
                {step.num}
              </Text>
              <Text className="font-body-semi text-body-lg text-on-secondary-container">
                {step.label}
              </Text>
            </View>
          ))}
        </Card>
      </View>
    </OnboardingShell>
  );
};

export default WelcomeScreen;
