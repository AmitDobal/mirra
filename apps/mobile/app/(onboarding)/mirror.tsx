import { router } from "expo-router";
import { Camera, Lock } from "lucide-react-native";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button, Card } from "@/ui";

/** S10 — Optional mirror selfie (camera stub). */
const MirrorScreen = () => {
  const c = onboardingCopy.mirror;
  const setMirrorSkipped = useOnboardingStore((s) => s.setMirrorSkipped);

  const goNext = (skipped: boolean) => {
    setMirrorSkipped(skipped);
    router.push("/(onboarding)/generating");
  };

  return (
    <OnboardingShell
      header={<ProgressHeader step={9} onBack={() => router.back()} />}
      footer={
        <>
          <Button label={c.capture} onPress={() => goNext(false)} />
          <Button
            label={c.skip}
            variant="outline"
            onPress={() => goNext(true)}
          />
        </>
      }
    >
      <Text className="mt-space-lg font-headline text-headline-md text-on-surface">
        {c.title}
      </Text>
      <Text className="mt-space-sm font-body text-body-sm text-on-surface-variant">
        {c.sub}
      </Text>
      <Card
        tone="lowest"
        className="mt-space-xl aspect-[3/4] max-h-[420px] items-center justify-center border border-outline-variant"
      >
        <Camera color={color.onSurfaceVariant} size={48} />
        <View className="mt-space-md flex-row items-center gap-space-xs">
          <Lock color={color.outline} size={14} />
          <Text className="font-body text-body-sm text-outline">{c.privacy}</Text>
        </View>
      </Card>
    </OnboardingShell>
  );
};

export default MirrorScreen;
