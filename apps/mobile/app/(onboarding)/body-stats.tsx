import { router } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

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

type StepperProps = {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  trailing?: ReactNode;
};

const Stepper = ({ label, value, onDec, onInc, trailing }: StepperProps) => (
  <View style={sx("rounded-DEFAULT bg-surface-container-high p-space-md")}>
    <View style={sx("mb-space-sm flex-row items-center justify-between")}>
      <Text style={sx("font-label text-label-md text-on-surface-variant")}>
        {label}
      </Text>
      {trailing}
    </View>
    <View style={sx("flex-row items-center justify-between")}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        onPress={onDec}
        style={sx(
          "h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest",
        )}
      >
        <Minus color={color.onSurface} size={18} />
      </Pressable>
      <Text style={sx("font-display text-display-metric text-on-surface")}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        onPress={onInc}
        style={sx(
          "h-touch w-touch items-center justify-center rounded-full bg-surface-container-highest",
        )}
      >
        <Plus color={color.onSurface} size={18} />
      </Pressable>
    </View>
  </View>
);

/** S05 — Sex / age / height / weight. */
const BodyStatsScreen = () => {
  const c = onboardingCopy.bodyStats;
  const sex = useOnboardingStore((s) => s.sex);
  const age = useOnboardingStore((s) => s.age);
  const heightCm = useOnboardingStore((s) => s.heightCm);
  const heightUnit = useOnboardingStore((s) => s.heightUnit);
  const weightKg = useOnboardingStore((s) => s.weightKg);
  const weightUnit = useOnboardingStore((s) => s.weightUnit);
  const setSex = useOnboardingStore((s) => s.setSex);
  const setAge = useOnboardingStore((s) => s.setAge);
  const setHeightCm = useOnboardingStore((s) => s.setHeightCm);
  const setHeightUnit = useOnboardingStore((s) => s.setHeightUnit);
  const setWeightKg = useOnboardingStore((s) => s.setWeightKg);
  const setWeightUnit = useOnboardingStore((s) => s.setWeightUnit);

  const heightDisplay =
    heightUnit === "cm" ? `${heightCm}` : `${(heightCm / 30.48).toFixed(1)}`;
  const weightDisplay =
    weightUnit === "kg"
      ? `${Math.round(weightKg)}`
      : `${Math.round(weightKg * 2.2046)}`;

  return (
    <OnboardingShell
      header={<ProgressHeader step={3} onBack={() => router.back()} />}
      footer={
        <Button
          label={c.continue}
          onPress={() => router.push("/(onboarding)/target")}
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
      <Text
        style={sx("mt-space-lg font-label text-label-md text-on-surface-variant")}
      >
        {c.sex}
      </Text>
      <View style={sx("mt-space-sm flex-row flex-wrap gap-space-sm")}>
        {c.sexOptions.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={sex === opt.id}
            onPress={() => setSex(opt.id)}
          />
        ))}
      </View>
      <View style={sx("mt-space-md gap-space-sm")}>
        <Stepper
          label={c.age}
          value={`${age}`}
          onDec={() => setAge(Math.max(13, age - 1))}
          onInc={() => setAge(Math.min(90, age + 1))}
        />
        <Stepper
          label={c.height}
          value={heightDisplay}
          onDec={() => setHeightCm(Math.max(120, heightCm - 1))}
          onInc={() => setHeightCm(Math.min(230, heightCm + 1))}
          trailing={
            <View style={sx("flex-row gap-space-xs")}>
              {(["cm", "ft"] as const).map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={heightUnit === u}
                  onPress={() => setHeightUnit(u)}
                />
              ))}
            </View>
          }
        />
        <Stepper
          label={c.weight}
          value={weightDisplay}
          onDec={() => setWeightKg(Math.max(35, weightKg - 1))}
          onInc={() => setWeightKg(Math.min(250, weightKg + 1))}
          trailing={
            <View style={sx("flex-row gap-space-xs")}>
              {(["kg", "lb"] as const).map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={weightUnit === u}
                  onPress={() => setWeightUnit(u)}
                />
              ))}
            </View>
          }
        />
      </View>
    </OnboardingShell>
  );
};

export default BodyStatsScreen;
