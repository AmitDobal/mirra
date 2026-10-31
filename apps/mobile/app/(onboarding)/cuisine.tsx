import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { Button, Chip } from "@/ui";

/** S09b — Cuisine styles (required, min 1). "Other" adds free text for AI context. */
const CuisineScreen = () => {
  const c = onboardingCopy.cuisine;
  const cuisines = useOnboardingStore((s) => s.cuisines);
  const cuisineOther = useOnboardingStore((s) => s.cuisineOther);
  const toggleCuisine = useOnboardingStore((s) => s.toggleCuisine);
  const setCuisineOther = useOnboardingStore((s) => s.setCuisineOther);

  const otherSelected = cuisines.includes("other");
  const otherOk = !otherSelected || cuisineOther.trim().length > 0;
  const canContinue = cuisines.length > 0 && otherOk;

  const handleContinue = () => router.push("/(onboarding)/mirror");

  return (
    <OnboardingShell
      header={<ProgressHeader step={8} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={!canContinue}
          onPress={handleContinue}
        />
      }
    >
      <View style={sx("mt-space-lg flex-row items-end justify-between gap-space-md")}>
        <Text style={sx("flex-1 font-headline text-headline-md text-on-surface")}>
          {c.title}
        </Text>
        {cuisines.length > 0 ? (
          <Text style={sx("font-label text-label-md text-primary-fixed")}>
            {c.selected(cuisines.length)}
          </Text>
        ) : null}
      </View>
      <Text style={sx("mt-space-sm font-body text-body-md text-on-surface-variant")}>
        {c.sub}
      </Text>
      <View style={sx("mt-space-lg flex-row flex-wrap gap-space-sm")}>
        {c.options.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={cuisines.includes(opt.id)}
            showCheck
            onPress={() => toggleCuisine(opt.id)}
          />
        ))}
      </View>
      {otherSelected ? (
        <View style={sx("mt-space-lg")}>
          <Text style={sx("mb-space-sm font-label text-label-md text-on-surface-variant")}>
            {c.otherLabel}
          </Text>
          <TextInput
            accessibilityLabel={c.otherLabel}
            placeholder={c.otherPlaceholder}
            placeholderTextColor={color.outline}
            value={cuisineOther}
            onChangeText={setCuisineOther}
            maxLength={200}
            style={sx("min-h-touch rounded-DEFAULT bg-surface-container-high px-space-md font-body text-body-lg text-on-surface")}
          />
        </View>
      ) : null}
    </OnboardingShell>
  );
};

export default CuisineScreen;
