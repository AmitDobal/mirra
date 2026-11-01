import { Image, View } from "react-native";

import { s09bTrainers } from "../../../assets/stitch";
import {
  getTrainerPersonaOption,
  type TrainerPersonaId,
} from "@/content/trainer-personas";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const PORTRAITS: Record<TrainerPersonaId, number> = {
  drill: s09bTrainers.drill,
  honey: s09bTrainers.honey,
  wit: s09bTrainers.wit,
  spark: s09bTrainers.spark,
  zen: s09bTrainers.zen,
  rival: s09bTrainers.rival,
};

type Props = {
  readonly personaId: string;
  readonly size?: number;
  readonly selected?: boolean;
  /** Accent corner dot — off for S09B head-and-shoulders cards. */
  readonly showAccentDot?: boolean;
};

/** Stitch head-and-shoulders portrait for a trainer persona. */
export const PersonaAvatar = ({
  personaId,
  size = 80,
  selected = false,
  showAccentDot = true,
}: Props) => {
  const persona = getTrainerPersonaOption(personaId);
  const source = PORTRAITS[persona.id];
  const showDot = showAccentDot && size >= 40;
  const dot = Math.max(10, Math.round(size * 0.18));
  return (
    <View
      accessible
      accessibilityLabel={`${persona.name} avatar`}
      style={{ width: size, height: size }}
    >
      <View
        style={[
          sx(`overflow-hidden rounded-full ${
            selected
              ? "border-2 border-primary-container"
              : "border border-surface-container-high"
          }`),
          { width: size, height: size },
        ]}
      >
        <Image
          source={source}
          accessibilityIgnoresInvertColors
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
      {showDot ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: persona.accent,
            borderWidth: 2,
            borderColor: color.surface,
          }}
        />
      ) : null}
    </View>
  );
};
