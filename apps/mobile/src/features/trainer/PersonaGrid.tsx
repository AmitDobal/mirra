import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

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
  /** Horizontal chips for You tab; default is S09B 2-col head-and-shoulders grid. */
  readonly compact?: boolean;
};

/** S09B Stitch — 2-col head/shoulders cards (not full vertical portraits). */
export const PersonaGrid = ({
  value,
  onSelect,
  disabled = false,
  compact = false,
}: Props) => {
  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="scrollbar"
        accessibilityLabel="Trainer choices"
        contentContainerStyle={{
          gap: space.sm,
          paddingVertical: space.xs,
          paddingRight: space.margin,
        }}
        style={sx("mb-space-sm")}
      >
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
                sx(
                  `items-center rounded-2xl border px-space-sm pt-space-sm pb-space-sm ${
                    selected
                      ? "border-2 border-primary-fixed bg-surface-container"
                      : "border-outline-variant/30 bg-surface-container-low"
                  } ${disabled ? "opacity-60" : ""}`,
                ),
                { width: 112, overflow: "visible" },
              ]}
            >
              <PersonaAvatar
                personaId={persona.id}
                size={48}
                selected={selected}
                showAccentDot={false}
              />
              <Text
                numberOfLines={1}
                style={sx(
                  "mt-1.5 text-center font-headline-semi text-[13px] leading-4 text-on-surface",
                )}
              >
                {persona.name}
              </Text>
              {selected ? (
                <View
                  accessible
                  accessibilityLabel="ACTIVE"
                  style={sx(
                    "mt-1 flex-row items-center gap-0.5 rounded-full bg-primary-fixed px-1.5 py-0.5",
                  )}
                >
                  <Check size={9} color={color.onPrimaryFixed} strokeWidth={3} />
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      fontSize: 8,
                      lineHeight: 10,
                      letterSpacing: 0.4,
                      color: color.onPrimaryFixed,
                    }}
                  >
                    ACTIVE
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Select AI trainer persona"
      style={sx("mb-space-md flex-row flex-wrap gap-space-sm")}
    >
      {TRAINER_PERSONA_OPTIONS.map((persona) => {
        const selected = persona.id === value;
        return (
          <Pressable
            key={persona.id}
            accessibilityRole="radio"
            accessibilityLabel={`${persona.name}. ${persona.demeanor}. ${persona.shortTagline}${selected ? ". Active" : ""}`}
            accessibilityState={{ selected, disabled, checked: selected }}
            disabled={disabled}
            onPress={() => onSelect(persona.id)}
            style={[
              sx(
                `relative items-center rounded-2xl border p-space-sm ${
                  selected
                    ? "border-2 border-primary-container bg-surface-container-low"
                    : "border-surface-container-high bg-surface-container-low"
                } ${disabled ? "opacity-60" : ""}`,
              ),
              { width: "48%", flexGrow: 1, maxWidth: "48%" },
            ]}
          >
            {selected ? (
              <View
                accessible
                accessibilityLabel="ACTIVE"
                style={sx(
                  "absolute -top-2.5 z-10 flex-row items-center gap-0.5 rounded-full bg-primary-container px-2 py-0.5",
                )}
              >
                <Check size={11} color={color.onPrimaryFixed} strokeWidth={3} />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 10,
                    lineHeight: 12,
                    letterSpacing: 0.4,
                    color: color.onPrimaryFixed,
                  }}
                >
                  ACTIVE
                </Text>
              </View>
            ) : null}
            <PersonaAvatar
              personaId={persona.id}
              size={64}
              selected={selected}
              showAccentDot={false}
            />
            <View
              style={sx(
                `mt-2.5 rounded-full px-2 py-0.5 ${
                  selected
                    ? "bg-secondary"
                    : "bg-surface-container-high"
                }`,
              )}
            >
              <Text
                style={sx(
                  selected
                    ? "font-label-bold text-[10px] uppercase text-surface"
                    : "font-label-bold text-[10px] uppercase text-on-surface-variant",
                )}
              >
                {persona.demeanor}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={sx(
                "mt-1 text-center font-headline-semi text-headline-sm text-primary",
              )}
            >
              {persona.name}
            </Text>
            <Text
              numberOfLines={1}
              style={sx(
                "text-center font-body text-body-sm text-on-surface-variant",
              )}
            >
              {persona.shortTagline}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
