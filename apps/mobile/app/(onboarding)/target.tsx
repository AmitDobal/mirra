import { router } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  useOnboardingImagery,
  useOnboardingStore,
} from "@/features/onboarding";
import { TargetPaceCards } from "@/features/onboarding/components/TargetPaceCards";
import { buildTargetPaceView } from "@/features/onboarding/goal-preview";
import { goalToday, useGoalSource } from "@/features/onboarding/use-goal-preview";
import { color } from "@/theme/tokens";
import { Button } from "@/ui";
import { sx } from "@/theme/sx";

/** S06 — Goal weight + pace. */
const TargetScreen = () => {
  const c = onboardingCopy.target;
  const { targetAthlete } = useOnboardingImagery();
  const goalWeightKg = useOnboardingStore((s) => s.goalWeightKg);
  const pace = useOnboardingStore((s) => s.pace);
  const weightUnit = useOnboardingStore((s) => s.weightUnit);
  const setGoalWeightKg = useOnboardingStore((s) => s.setGoalWeightKg);
  const setPace = useOnboardingStore((s) => s.setPace);

  const kg = goalWeightKg ?? 70;
  const source = useGoalSource();
  // Live engine numbers for the displayed goal weight (AMI-180); pace changes re-run it.
  const paceView = useMemo(() => buildTargetPaceView(source, kg, goalToday()), [source, kg]);
  const display =
    weightUnit === "kg"
      ? `${Math.round(kg)}`
      : `${Math.round(kg * 2.2046)}`;

  const handleContinue = () => {
    // The stepper shows a value even after "Skip" (null); Continue commits what is shown.
    if (goalWeightKg === null) setGoalWeightKg(kg);
    router.push("/(onboarding)/physique");
  };
  const handleSkip = () => {
    setGoalWeightKg(null);
    router.push("/(onboarding)/physique");
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
      <QuizEyebrow label={c.eyebrow} />
      <Text style={sx("font-headline text-headline-md text-on-surface")}>
        {c.title}
      </Text>
      <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
        {c.sub}
      </Text>
      <Image
        source={targetAthlete}
        accessibilityLabel={c.imageLabel}
        style={{ width: "100%", height: 140, borderRadius: 12, marginTop: 16 }}
        resizeMode="cover"
      />
      <View
        style={sx("mt-space-lg rounded-DEFAULT bg-surface-container-high p-space-md")}
      >
        <Text
          style={sx("mb-space-sm font-label text-label-md text-on-surface-variant")}
        >
          {c.goalWeight}
        </Text>
        <View style={sx("flex-row items-center justify-between")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.decrease}
            onPress={() => setGoalWeightKg(Math.max(40, kg - 1))}
            style={sx(
              "h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest",
            )}
          >
            <Minus color={color.onSurface} size={18} />
          </Pressable>
          <Text style={sx("font-display text-display-metric text-on-surface")}>
            {display} {weightUnit}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.increase}
            onPress={() => setGoalWeightKg(Math.min(200, kg + 1))}
            style={sx(
              "h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest",
            )}
          >
            <Plus color={color.onSurface} size={18} />
          </Pressable>
        </View>
        <View style={sx("mt-space-sm flex-row items-center justify-between px-space-xs")}>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            {c.current(paceView.current)}
          </Text>
          {paceView.overall ? (
            <Text style={sx("font-label text-label-md text-primary-fixed")}>
              {c.overall(paceView.overall)}
            </Text>
          ) : null}
        </View>
        <View style={sx("mt-space-lg")}>
          <TargetPaceCards pace={pace} view={paceView} onSelect={setPace} />
        </View>
      </View>
    </OnboardingShell>
  );
};

export default TargetScreen;
