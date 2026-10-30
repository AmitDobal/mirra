import { router } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button, Chip } from "@/ui";

/** S06 — Goal weight + pace. */
const TargetScreen = () => {
  const c = onboardingCopy.target;
  const goalWeightKg = useOnboardingStore((s) => s.goalWeightKg);
  const pace = useOnboardingStore((s) => s.pace);
  const weightUnit = useOnboardingStore((s) => s.weightUnit);
  const setGoalWeightKg = useOnboardingStore((s) => s.setGoalWeightKg);
  const setPace = useOnboardingStore((s) => s.setPace);

  const kg = goalWeightKg ?? 70;
  const display =
    weightUnit === "kg"
      ? `${Math.round(kg)}`
      : `${Math.round(kg * 2.2046)}`;

  const handleContinue = () => router.push("/(onboarding)/equipment");
  const handleSkip = () => {
    setGoalWeightKg(null);
    router.push("/(onboarding)/equipment");
  };

  return (
    <OnboardingShell
      header={<ProgressHeader step={4} onBack={() => router.back()} />}
      footer={
        <>
          <Button label={c.continue} onPress={handleContinue} />
          <Button label={c.skip} variant="ghost" onPress={handleSkip} />
        </>
      }
    >
      <Text className="mt-space-lg font-headline text-headline-md text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-lg rounded-DEFAULT bg-surface-container-high p-space-md">
        <Text className="mb-space-sm font-label text-label-md text-on-surface-variant">
          {c.goalWeight}
        </Text>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease goal weight"
            onPress={() => setGoalWeightKg(Math.max(40, kg - 1))}
            className="h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest"
          >
            <Minus color={color.onSurface} size={18} />
          </Pressable>
          <Text className="font-display text-display-metric text-on-surface">
            {display} {weightUnit}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase goal weight"
            onPress={() => setGoalWeightKg(Math.min(200, kg + 1))}
            className="h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest"
          >
            <Plus color={color.onSurface} size={18} />
          </Pressable>
        </View>
      </View>
      <Text className="mt-space-lg font-label text-label-md text-on-surface-variant">
        {c.pace}
      </Text>
      <View className="mt-space-sm flex-row gap-space-sm">
        <Chip
          label={c.steady}
          selected={pace === "steady"}
          onPress={() => setPace("steady")}
        />
        <Chip
          label={c.aggressive}
          selected={pace === "aggressive"}
          onPress={() => setPace("aggressive")}
        />
      </View>
    </OnboardingShell>
  );
};

export default TargetScreen;
