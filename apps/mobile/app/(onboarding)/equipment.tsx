import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  QuizEyebrow,
  QuizHint,
  useOnboardingStore,
} from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button, Chip } from "@/ui";
import { sx } from "@/theme/sx";

/** S07 — Multi-select equipment. */
const EquipmentScreen = () => {
  const c = onboardingCopy.equipment;
  const equipment = useOnboardingStore((s) => s.equipment);
  const toggleEquipment = useOnboardingStore((s) => s.toggleEquipment);

  return (
    <OnboardingShell
      header={<ProgressHeader step={6} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={equipment.length === 0}
          onPress={() => router.push("/(onboarding)/schedule")}
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
            selected={equipment.includes(opt.id)}
            showCheck
            onPress={() => toggleEquipment(opt.id)}
          />
        ))}
      </View>
      <QuizHint
        icon={<MapPin size={16} color={color.onSecondaryContainer} />}
        caption={c.hintCaption}
      >
        {c.hint}
      </QuizHint>
    </OnboardingShell>
  );
};

export default EquipmentScreen;
