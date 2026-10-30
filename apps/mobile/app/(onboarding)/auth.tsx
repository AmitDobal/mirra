import { router } from "expo-router";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { Button } from "@/ui";

/** S14 — Auth stub → tabs. */
const AuthScreen = () => {
  const c = onboardingCopy.auth;
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  const finish = () => {
    markCompleted();
    router.replace("/(tabs)/today");
  };

  return (
    <OnboardingShell
      footer={
        <View className="flex-row items-center justify-center gap-space-md">
          <Text className="font-body text-body-sm text-outline">{c.privacy}</Text>
          <Text className="font-body text-body-sm text-outline">·</Text>
          <Text className="font-body text-body-sm text-outline">{c.terms}</Text>
        </View>
      }
    >
      <Text className="mt-space-xl font-headline text-headline-lg text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-xl gap-space-sm">
        <Button label={c.apple} variant="apple" onPress={finish} />
        <Button label={c.google} variant="outline" onPress={finish} />
        <Button label={c.email} variant="surface" onPress={finish} />
        <Button label={c.notNow} variant="ghost" onPress={finish} />
      </View>
    </OnboardingShell>
  );
};

export default AuthScreen;
