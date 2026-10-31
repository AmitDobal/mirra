import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button, Chip } from "@/ui";
import { sx } from "@/theme/sx";

/** S09 — Diet prefs + avoid field. */
const DietScreen = () => {
  const c = onboardingCopy.diet;
  const diet = useOnboardingStore((s) => s.diet);
  const foodsToAvoid = useOnboardingStore((s) => s.foodsToAvoid);
  const toggleDiet = useOnboardingStore((s) => s.toggleDiet);
  const setFoodsToAvoid = useOnboardingStore((s) => s.setFoodsToAvoid);

  return (
    <OnboardingShell
      header={<ProgressHeader step={9} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={diet.length === 0}
          onPress={() => router.push("/(onboarding)/cuisine")}
        />
      }
    >
      <QuizEyebrow label={c.eyebrow} />
      <Text style={sx("font-headline text-headline-md text-on-surface")}>
        {c.title}
      </Text>
      <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
        {c.sub}
      </Text>
      <View style={sx("mt-space-lg flex-row flex-wrap gap-space-sm")}>
        {c.options.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={diet.includes(opt.id)}
            showCheck
            onPress={() => toggleDiet(opt.id)}
          />
        ))}
      </View>
      <Text
        style={sx("mt-space-xl font-label text-label-md text-on-surface-variant")}
      >
        {c.avoid}
      </Text>
      <TextInput
        accessibilityLabel={c.avoid}
        placeholder={c.avoidPlaceholder}
        placeholderTextColor={color.outline}
        value={foodsToAvoid}
        onChangeText={setFoodsToAvoid}
        style={sx(
          "mt-space-sm min-h-touch rounded-DEFAULT bg-surface-container-high px-space-md font-body text-body-lg text-on-surface",
        )}
      />
    </OnboardingShell>
  );
};

export default DietScreen;
