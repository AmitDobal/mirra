import { router } from "expo-router";
import { Text } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  useOnboardingStore,
} from "@/features/onboarding";
import { PersonaGrid, VoicePreviewBar } from "@/features/trainer";
import { sx } from "@/theme/sx";
import { Button } from "@/ui";

/** S09B Stitch — pick trainer character portraits. Stored as `trainerPersona`. */
const TrainerScreen = () => {
  const c = onboardingCopy.trainer;
  const trainerPersona = useOnboardingStore((s) => s.trainerPersona);
  const setTrainerPersona = useOnboardingStore((s) => s.setTrainerPersona);

  const handleContinue = () => router.push("/(onboarding)/mirror");

  return (
    <OnboardingShell
      header={<ProgressHeader step={11} onBack={() => router.back()} />}
      footer={<Button label={c.continue} onPress={handleContinue} />}
    >
      <QuizEyebrow label={c.eyebrow} />
      <Text style={sx("font-headline text-headline-lg text-on-surface")}>
        {c.title}
      </Text>
      <Text
        style={sx(
          "mb-space-lg mt-space-sm font-body text-body-md text-on-surface-variant",
        )}
      >
        {c.sub}
      </Text>
      <PersonaGrid value={trainerPersona} onSelect={setTrainerPersona} />
      <VoicePreviewBar personaId={trainerPersona} />
    </OnboardingShell>
  );
};

export default TrainerScreen;
