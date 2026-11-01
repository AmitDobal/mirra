import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font, radius, type } from "@/theme/tokens";

import { MODE_LABEL, type AdjustMode } from "./checkin-logic";
import { PressScale } from "./PressScale";

const ORDER: readonly AdjustMode[] = ["lighter", "keep", "short"];

type Props = {
  readonly mode: AdjustMode;
  readonly onChange: (mode: AdjustMode) => void;
};

/** Keep / Lighter / Short — the active pill is lime with a check. */
export const ProposalPills = ({ mode, onChange }: Props) => (
  <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Today's plan">
    {ORDER.map((id) => {
      const selected = id === mode;
      return (
        <PressScale
          key={id}
          accessibilityRole="radio"
          accessibilityLabel={MODE_LABEL[id]}
          accessibilityState={{ selected }}
          onPress={() => onChange(id)}
          style={[styles.pill, selected && styles.pillOn]}
        >
          {selected ? <Check size={16} color={color.onPrimary} strokeWidth={3} /> : null}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.text, selected && styles.textOn]}
          >
            {MODE_LABEL[id]}
          </Text>
        </PressScale>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  pillOn: { backgroundColor: color.primaryContainer, borderColor: color.primaryContainer },
  text: { flexShrink: 1, fontFamily: font.label, fontSize: type.labelMd.size, color: color.onSurfaceVariant },
  textOn: { fontFamily: font.labelBold, fontSize: type.labelLg.size, color: color.onPrimary },
});
