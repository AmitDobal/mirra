import { Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { NA, type MacroAverages } from "./history-model";

type RowProps = {
  readonly label: string;
  readonly avg: number | null;
  readonly target: number | null;
  readonly tint: string;
};

const MacroRow = ({ label, avg, target, tint }: RowProps) => {
  const ratio = avg !== null && target ? Math.min(avg / target, 1) : 0;
  const value =
    avg === null ? NA : target ? `${avg}g / ${target}g target` : `${avg}g avg`;
  return (
    <View style={sx("mb-space-sm")}>
      <View style={sx("mb-1 flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-2")}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
          <Text style={sx("font-body-medium text-body-sm text-on-surface")}>{label}</Text>
        </View>
        <Text style={sx("font-label text-label-md text-on-surface")}>{value}</Text>
      </View>
      <View
        accessible
        accessibilityLabel={`${label} ${value}`}
        style={{ height: 10, borderRadius: 5, backgroundColor: color.surfaceContainerHighest, overflow: "hidden" }}
      >
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: 10, borderRadius: 5, backgroundColor: tint }} />
      </View>
    </View>
  );
};

type Props = {
  readonly averages: MacroAverages;
  readonly proteinTarget: number | null;
  readonly carbsTarget: number | null;
  readonly fatTarget: number | null;
};

/** Per-logged-day macro averages vs daily targets. */
export const MacroAdherence = ({ averages, proteinTarget, carbsTarget, fatTarget }: Props) => (
  <View style={sx("mb-space-md rounded-lg bg-surface-container-low p-space-md")}>
    <View style={sx("mb-space-md flex-row items-center justify-between")}>
      <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>Macro Adherence</Text>
      <CapsLabel tone="lime">Daily averages</CapsLabel>
    </View>
    <MacroRow label="Protein" avg={averages.proteinG} target={proteinTarget} tint={color.primaryContainer} />
    <MacroRow label="Carbohydrates" avg={averages.carbsG} target={carbsTarget} tint={color.secondary} />
    <MacroRow label="Fats" avg={averages.fatG} target={fatTarget} tint={color.onSurfaceVariant} />
  </View>
);
