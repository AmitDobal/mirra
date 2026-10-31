import { router } from "expo-router";
import { Activity, Dumbbell, Shield, Sparkles, Zap } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  SelectRow,
  useOnboardingStore,
} from "@/features/onboarding";
import type { PhysiqueId } from "@/features/onboarding/types";
import { color } from "@/theme/tokens";
import { Button } from "@/ui";
import { sx } from "@/theme/sx";

const ICONS: Record<PhysiqueId, ReactNode> = {
  lean_cut: <Zap size={18} color={color.onSurfaceVariant} />,
  athletic: <Activity size={18} color={color.onSurfaceVariant} />,
  muscular: <Dumbbell size={18} color={color.onSurfaceVariant} />,
  toned: <Sparkles size={18} color={color.onSurfaceVariant} />,
  strong: <Shield size={18} color={color.onSurfaceVariant} />,
};

/** Physique target — optional look bias for AI programming. */
const PhysiqueScreen = () => {
  const c = onboardingCopy.physique;
  const physiqueTarget = useOnboardingStore((s) => s.physiqueTarget);
  const setPhysiqueTarget = useOnboardingStore((s) => s.setPhysiqueTarget);

  const goNext = () => router.push("/(onboarding)/equipment");

  const handleSkip = () => {
    setPhysiqueTarget(null);
    goNext();
  };

  return (
    <OnboardingShell
      header={<ProgressHeader step={5} onBack={() => router.back()} />}
      footer={
        <>
          <Button
            label={c.continue}
            disabled={!physiqueTarget}
            onPress={goNext}
          />
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
      <View style={sx("mt-space-lg gap-space-sm")}>
        {c.options.map((opt) => (
          <SelectRow
            key={opt.id}
            label={opt.label}
            hint={opt.hint}
            selected={physiqueTarget === opt.id}
            onPress={() => setPhysiqueTarget(opt.id)}
            icon={ICONS[opt.id]}
          />
        ))}
      </View>
    </OnboardingShell>
  );
};

export default PhysiqueScreen;
