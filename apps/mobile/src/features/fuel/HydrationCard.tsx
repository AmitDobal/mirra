import { Droplets } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

const CHIPS_ML = [250, 500] as const;

const toLitres = (ml: number) => `${Math.round(ml / 10) / 100}L`;

type Props = {
  readonly loggedMl: number;
  readonly targetMl: number;
  readonly onAdd: (ml: number) => void;
};

export const HydrationCard = ({ loggedMl, targetMl, onAdd }: Props) => {
  const pct = targetMl > 0 ? Math.min(100, Math.round((loggedMl / targetMl) * 100)) : 0;
  return (
    <View style={sx("mt-space-sm rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("flex-row items-center gap-space-md")}>
        <Droplets size={22} color={color.primaryFixed} />
        <View style={sx("flex-1")}>
          <CapsLabel>Hydration</CapsLabel>
          <Text style={sx("font-body-medium text-body-md text-on-surface")}>
            {toLitres(loggedMl)} / {toLitres(targetMl)}
          </Text>
        </View>
        {CHIPS_ML.map((ml) => (
          <Pressable
            key={ml}
            accessibilityRole="button"
            accessibilityLabel={`Add ${ml} millilitres of water`}
            onPress={() => onAdd(ml)}
            style={sx("rounded-full bg-surface-container-highest px-3 py-2")}
          >
            <CapsLabel tone="lime">+{ml}</CapsLabel>
          </Pressable>
        ))}
      </View>
      <View style={sx("mt-space-sm h-1 overflow-hidden rounded-full bg-surface-container-highest")}>
        <View
          style={[sx("h-full rounded-full"), { width: `${pct}%`, backgroundColor: color.primaryFixed }]}
        />
      </View>
    </View>
  );
};
