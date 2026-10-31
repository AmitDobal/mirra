import { Text, View } from "react-native";

import { macroMeter, type MacroState } from "@/lib/macro-meter";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

/** under = primary, hit = primary dim, over = tertiary (token-only warning). */
const STATE_COLOR: Record<MacroState, string> = {
  under: color.primaryFixed,
  hit: color.primaryFixedDim,
  over: color.tertiaryFixedDim,
};

type MeterProps = {
  readonly label: string;
  readonly logged: number;
  readonly target: number | null;
};

const MacroMeterRow = ({ label, logged, target }: MeterProps) => {
  const meter = macroMeter(logged, target ?? 0);
  const tint = STATE_COLOR[meter.state];
  const hasTarget = target != null && target > 0;
  return (
    <View
      style={sx("flex-1")}
      accessible
      accessibilityLabel={`${label} ${Math.round(logged)} of ${target ?? "no"} grams, ${meter.label}`}
    >
      <CapsLabel>{label}</CapsLabel>
      <Text style={sx("mt-1 font-headline-sm text-headline-sm text-on-surface")}>
        {Math.round(logged)}
        {hasTarget ? (
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            {` /${Math.round(target)}g`}
          </Text>
        ) : (
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>g</Text>
        )}
      </Text>
      <View
        style={sx("my-1 h-1 overflow-hidden rounded-full bg-surface-container-highest")}
      >
        <View
          style={[
            sx("h-full rounded-full"),
            { width: `${meter.pct}%`, backgroundColor: tint },
          ]}
        />
      </View>
      {hasTarget ? (
        <Text style={[sx("font-body text-body-sm"), { color: tint }]}>{meter.label}</Text>
      ) : null}
    </View>
  );
};

type Props = {
  readonly protein: { logged: number; target: number | null };
  readonly carbs: { logged: number; target: number | null };
  readonly fat: { logged: number; target: number | null };
};

/** S18 P/C/F meters: thin bars, remaining-first labels. */
export const MacroMeters = ({ protein, carbs, fat }: Props) => (
  <View style={sx("mt-space-md flex-row gap-space-md")}>
    <MacroMeterRow label="Protein" {...protein} />
    <MacroMeterRow label="Carbs" {...carbs} />
    <MacroMeterRow label="Fats" {...fat} />
  </View>
);
