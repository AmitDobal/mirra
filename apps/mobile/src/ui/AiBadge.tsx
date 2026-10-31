import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { getTrainerPersonaOption } from "@/content/trainer-personas";
import { PersonaAvatar } from "@/features/trainer/PersonaAvatar";
import { usePersonaStore } from "@/features/trainer/persona-store";
import { color, font, radius, space, type } from "@/theme/tokens";

type Props = {
  /** Show trainer name (or "AI") next to the avatar. */
  label?: boolean;
  /** `lime` on dark surfaces; `dark` on primary-fixed (lime) cards. */
  tone?: "lime" | "dark";
  /** Avatar diameter. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const toneColor = {
  lime: color.primaryFixed,
  dark: color.onPrimaryFixed,
} as const;

/**
 * Marker for LLM-powered surfaces — tiny photo of the active trainer
 * so the user always sees which coach is speaking.
 */
export const AiBadge = ({ label = true, tone = "lime", size = 18, style }: Props) => {
  const personaId = usePersonaStore((s) => s.persona);
  const persona = getTrainerPersonaOption(personaId);
  const tint = toneColor[tone];
  return (
    <View
      accessible
      accessibilityLabel={`AI trainer ${persona.name}`}
      style={[styles.base, { backgroundColor: `${tint}26` }, style]}
    >
      <PersonaAvatar personaId={personaId} size={size} selected={false} />
      {label ? (
        <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
          {persona.name}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  label: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    maxWidth: 96,
  },
});
