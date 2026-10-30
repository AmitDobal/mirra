import { router } from "expo-router";
import { Image, Text, View } from "react-native";

import { s02WelcomeHook } from "../../assets/stitch";
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
        <Image
          source={s02WelcomeHook.heroRunnerSilhouette}
          accessibilityLabel="Athlete silhouette"
          style={{ width: "100%", height: 180, borderRadius: 16, marginBottom: 16 }}
          resizeMode="cover"
        />
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
        <View className="mt-space-md flex-row gap-space-sm">
          <Image
            source={s02WelcomeHook.portraitWomanAthlete}
            accessibilityLabel="Athlete portrait"
            style={{ flex: 1, height: 96, borderRadius: 12 }}
            resizeMode="cover"
          />
          <Image
            source={s02WelcomeHook.portraitMaleCrossfit}
            accessibilityLabel="Athlete portrait"
            style={{ flex: 1, height: 96, borderRadius: 12 }}
            resizeMode="cover"
          />
        </View>
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
