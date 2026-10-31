import { Play } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import {
  getTrainerPersonaOption,
  type TrainerPersonaId,
} from "@/content/trainer-personas";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly personaId: TrainerPersonaId;
  readonly onPress?: () => void;
};

/** S09B — sticky voice preview strip under the persona grid. */
export const VoicePreviewBar = ({ personaId, onPress }: Props) => {
  const persona = getTrainerPersonaOption(personaId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voice preview for ${persona.name}`}
      onPress={onPress}
      style={sx(
        "mt-space-md flex-row items-center gap-space-sm rounded-2xl bg-surface-container-low px-space-md py-space-md",
      )}
    >
      <View
        style={sx(
          "h-9 w-9 items-center justify-center rounded-full bg-primary-fixed",
        )}
      >
        <Play
          color={color.onPrimaryFixed}
          fill={color.onPrimaryFixed}
          size={16}
        />
      </View>
      <View style={sx("flex-1")}>
        <Text style={sx("font-label-bold text-label-caps text-primary-fixed")}>
          Voice preview
        </Text>
        <Text
          numberOfLines={2}
          style={[
            sx("mt-0.5 font-body text-body-sm text-on-surface-variant"),
            { fontStyle: "italic" },
          ]}
        >
          {`“${persona.sampleLine}”`}
        </Text>
      </View>
      <View style={sx("h-6 w-14 flex-row items-end justify-between gap-0.5")}>
        {[4, 10, 7, 14, 6, 11, 5, 9].map((h, i) => (
          <View
            key={i}
            style={[
              sx("w-1 rounded-full bg-primary-fixed/70"),
              { height: h },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
};
