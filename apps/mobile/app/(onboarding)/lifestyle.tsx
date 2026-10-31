import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  QuizHint,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button } from "@/ui";
import { sx } from "@/theme/sx";

const MAX = 2000;

/** Free-text routine / likes — optional coach context. */
const LifestyleScreen = () => {
  const c = onboardingCopy.lifestyle;
  const lifestyleNotes = useOnboardingStore((s) => s.lifestyleNotes);
  const setLifestyleNotes = useOnboardingStore((s) => s.setLifestyleNotes);

  const goNext = () => router.push("/(onboarding)/diet");

  const handleSkip = () => {
    setLifestyleNotes("");
    goNext();
  };

  const handleContinue = () => goNext();

  return (
    <OnboardingShell
      header={<ProgressHeader step={8} onBack={() => router.back()} />}
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
      <TextInput
        accessibilityLabel={c.title}
        multiline
        textAlignVertical="top"
        maxLength={MAX}
        placeholder={c.placeholder}
        placeholderTextColor={color.outline}
        value={lifestyleNotes}
        onChangeText={setLifestyleNotes}
        style={sx(
          "mt-space-lg min-h-[160px] rounded-2xl bg-surface-container-high p-space-md font-body text-body-md text-on-surface",
        )}
      />
      <View style={sx("mt-space-sm flex-row justify-between")}>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
          {lifestyleNotes.trim().length > 0 ? "Context saved" : "Optional"}
        </Text>
        <Text style={sx("font-label text-label-md text-on-surface-variant")}>
          {lifestyleNotes.length}/{MAX}
        </Text>
      </View>
      <QuizHint>{c.helper}</QuizHint>
    </OnboardingShell>
  );
};

export default LifestyleScreen;
