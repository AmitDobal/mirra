import { Check } from "lucide-react-native";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import {
  TRAINER_PERSONA_OPTIONS,
  type TrainerPersonaId,
} from "@/content/trainer-personas";
import { color, space } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { PersonaAvatar } from "./PersonaAvatar";

type Props = {
  readonly value: TrainerPersonaId;
  readonly onSelect: (id: TrainerPersonaId) => void;
  readonly disabled?: boolean;
  readonly compact?: boolean;
};

/** Stitch S09B / S24 — 2-col trainer cards. Selected: check + ACTIVE under name (no avatar overlap). */
export const PersonaGrid = ({
  value,
  onSelect,
  disabled = false,
  compact = false,
}: Props) => {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.floor((windowWidth - space.margin * 2 - space.sm) / 2);
  const avatarSize = compact ? 48 : 72;
  const pad = compact ? "px-space-sm pt-space-sm pb-space-sm" : "p-space-md";

  return (
    <View style={sx("flex-row flex-wrap justify-between gap-y-space-sm")}>
      {TRAINER_PERSONA_OPTIONS.map((persona) => {
        const selected = persona.id === value;
        return (
          <Pressable
            key={persona.id}
            accessibilityRole="button"
            accessibilityLabel={`${persona.name}. ${persona.tagline}${selected ? ". Active" : ""}`}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(persona.id)}
            style={[
              sx(`items-center rounded-2xl border ${pad} ${
                selected
                  ? "border-2 border-primary-fixed bg-surface-container"
                  : "border-outline-variant/30 bg-surface-container-low"
              } ${disabled ? "opacity-60" : ""}`),
              { width: cardWidth, overflow: "visible" },
            ]}
          >
            <PersonaAvatar
              personaId={persona.id}
              size={avatarSize}
              selected={selected}
            />
            <Text
              numberOfLines={1}
              style={sx(
                compact
                  ? "mt-1.5 text-center font-headline-semi text-[13px] leading-4 text-on-surface"
                  : "mt-space-sm text-center font-headline-semi text-headline-sm text-on-surface",
              )}
            >
              {persona.name}
            </Text>
            {selected ? (
              <View
                accessible
                accessibilityLabel="ACTIVE"
                style={sx(
                  compact
                    ? "mt-1 flex-row items-center gap-0.5 rounded-full bg-primary-fixed px-1.5 py-0.5"
                    : "mt-1 flex-row items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5",
                )}
              >
                <Check
                  size={compact ? 9 : 10}
                  color={color.onPrimaryFixed}
                  strokeWidth={3}
                />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: compact ? 8 : 9,
                    lineHeight: compact ? 10 : 11,
                    letterSpacing: 0.4,
                    color: color.onPrimaryFixed,
                  }}
                >
                  ACTIVE
                </Text>
              </View>
            ) : null}
            {compact ? null : (
              <Text
                numberOfLines={2}
                style={sx(
                  "mt-1 text-center font-body text-body-sm text-on-surface-variant",
                )}
              >
                {persona.tagline}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
