import { Camera } from "lucide-react-native";
import { Image, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

export const Stat = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) => (
  <View style={sx("flex-1 rounded-lg bg-surface-container-high p-space-md")}>
    <CapsLabel>{label}</CapsLabel>
    <Text style={sx("mt-1 font-display text-headline-md text-primary-fixed")}>{value}</Text>
    <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{unit}</Text>
  </View>
);

export const PhotoSlot = ({
  label,
  sub,
  highlight,
  uri,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
  uri?: string | null;
}) => (
  <View style={sx("flex-1")}>
    <View
      style={sx(`mb-space-xs h-40 overflow-hidden rounded-lg ${
        highlight ? "border border-primary-fixed" : ""
      }`)}
    >
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={label}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={sx(
            "h-full w-full items-center justify-center bg-surface-container-highest",
          )}
        >
          <Camera size={28} color={color.onSurfaceVariant} />
          <Text style={sx("mt-2 font-body text-body-sm text-on-surface-variant")}>
            No photo
          </Text>
        </View>
      )}
    </View>
    <CapsLabel>{label}</CapsLabel>
    <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{sub}</Text>
  </View>
);
