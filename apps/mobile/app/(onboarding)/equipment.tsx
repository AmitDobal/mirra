import { router } from "expo-router";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import {
  OnboardingShell,
  ProgressHeader,
  useOnboardingStore,
} from "@/features/onboarding";
import { Button, Chip } from "@/ui";

/** S07 — Multi-select equipment. */
const EquipmentScreen = () => {
  const c = onboardingCopy.equipment;
  const equipment = useOnboardingStore((s) => s.equipment);
  const toggleEquipment = useOnboardingStore((s) => s.toggleEquipment);

  return (
    <OnboardingShell
      header={<ProgressHeader step={5} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          disabled={equipment.length === 0}
          onPress={() => router.push("/(onboarding)/schedule")}
        />
      }
    >
      <Text className="mt-space-lg font-headline text-headline-md text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-lg flex-row flex-wrap gap-space-sm">
        {c.options.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={equipment.includes(opt.id)}
            onPress={() => toggleEquipment(opt.id)}
          />
        ))}
      </View>
    </OnboardingShell>
  );
};

export default EquipmentScreen;
