import { router } from "expo-router";
import {
  CalendarCheck,
  Dumbbell,
  Flame,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  QuizHint,
  SelectRow,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button } from "@/ui";
import { sx } from "@/theme/sx";

const GOAL_ICONS: Record<string, ReactNode> = {
  lose_fat: <Flame size={18} color={color.onPrimaryFixed} />,
  build_muscle: <Dumbbell size={18} color={color.onPrimaryFixed} />,
  recomp: <RefreshCw size={18} color={color.onPrimaryFixed} />,
  consistent: <CalendarCheck size={18} color={color.onPrimaryFixed} />,
  performance: <Trophy size={18} color={color.onPrimaryFixed} />,
};

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
      <QuizEyebrow label={c.eyebrow} />
      <View style={sx("gap-space-sm")}>
        <Text style={sx("font-headline text-headline-md text-on-surface")}>
          {c.title}
        </Text>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
          {c.hint}
        </Text>
      </View>
      <View style={sx("mt-space-lg gap-space-sm")}>
        {c.options.map((opt) => (
          <SelectRow
            key={opt.id}
            label={opt.label}
            selected={goal === opt.id}
            onPress={() => setGoal(opt.id)}
            icon={GOAL_ICONS[opt.id]}
          />
        ))}
      </View>
      <QuizHint
        icon={<Sparkles size={16} color={color.onSecondaryContainer} />}
        caption="Adaptive coaching"
      >
        {c.footer}
      </QuizHint>
    </OnboardingShell>
  );
};

export default GoalScreen;
