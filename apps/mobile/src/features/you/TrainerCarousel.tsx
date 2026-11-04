import { Check } from "lucide-react-native";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { profileCopy } from "@/content/profile";
import { TRAINER_PERSONA_OPTIONS, type TrainerPersonaId } from "@/content/trainer-personas";
import { personaPortrait } from "@/features/trainer/PersonaAvatar";
import { color, space } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

import { t } from "./you-text";

type Props = {
  readonly value: TrainerPersonaId;
  readonly disabled?: boolean;
  readonly onSelect: (id: TrainerPersonaId) => void;
};

const CARD_W = 104;

/** S41 compact trainer cards: real S09B portraits (88pt tile), lime ring + check on the active one. */
export const TrainerCarousel = ({ value, disabled = false, onSelect }: Props) => (
  <>
    <View style={[sx("flex-row items-center justify-between px-1"), { marginBottom: 10 }]}>
      <CapsLabel>{profileCopy.trainerHeader}</CapsLabel>
      <Text style={t.hint}>{profileCopy.trainerHint}</Text>
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Trainer choices"
      style={{ marginHorizontal: -space.margin }}
      contentContainerStyle={{ gap: 12, paddingHorizontal: space.margin, paddingBottom: 4 }}
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
                `items-center rounded-[20px] bg-surface-container-high p-2 ${
                  selected ? "border-primary-fixed" : "border-surface-container-highest"
                } ${disabled ? "opacity-60" : ""}`,
              ),
              { width: CARD_W, borderWidth: selected ? 2 : 1 },
            ]}
          >
            <View style={sx("h-[88px] w-full overflow-hidden rounded-[16px] bg-surface-container-highest")}>
              <Image
                source={personaPortrait(persona.id)}
                accessibilityIgnoresInvertColors
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              {selected ? (
                <View style={sx("absolute right-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-primary-fixed")}>
                  <Check size={13} color={color.onPrimaryFixed} strokeWidth={3} />
                </View>
              ) : null}
            </View>
            {/* Two lines so "Drill Sergeant" never truncates; every card keeps the same height. */}
            <View style={[sx("mt-2 w-full items-center justify-center"), { minHeight: 36 }]}>
              <Text
                numberOfLines={2}
                style={t.trainerName}
              >
                {persona.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  </>
);
