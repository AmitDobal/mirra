import { Text, View } from "react-native";

import type { MacroKey, MacroMeter, MacroState } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

const LABEL: Record<MacroKey, string> = {
  kcal: "Kcal",
  proteinG: "Protein",
  carbsG: "Carbs",
  fatG: "Fat",
};

const STATE_COLOR: Record<MacroState, string> = {
  under: color.primaryFixed,
  hit: color.primaryFixedDim,
  over: color.tertiaryFixedDim,
};

/** Four thin bars (kcal / P / C / F), state-tinted; no text beyond the label. */
export const MacroStrip = ({ macros }: { readonly macros: readonly MacroMeter[] }) => {
  if (macros.length === 0) return null;
  return (
    <View style={sx("mb-space-md flex-row gap-space-sm")}>
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min(100, Math.round((m.logged / m.target) * 100)) : 0;
        return (
          <View
            key={m.key}
            style={sx("flex-1")}
            accessible
            accessibilityLabel={`${LABEL[m.key]} ${m.logged} of ${m.target}, ${m.state}`}
          >
            <CapsLabel>{LABEL[m.key]}</CapsLabel>
            <View style={sx("my-1 h-1 overflow-hidden rounded-full bg-surface-container-highest")}>
              <View
                style={[
                  sx("h-full rounded-full"),
                  { width: `${pct}%`, backgroundColor: STATE_COLOR[m.state] },
                ]}
              />
            </View>
            <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
              {m.logged}/{m.target}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
