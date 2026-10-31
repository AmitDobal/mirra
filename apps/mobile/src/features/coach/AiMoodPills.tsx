import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Text } from "react-native";

import type { CoachPill, CoachPillTone } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

type Props = {
  readonly pills: readonly CoachPill[];
  readonly onSetReadiness: (readiness: "push" | "rest") => void;
  readonly onSelectVector: (vectorId: string) => void;
};

/** Tone → chip + label classes, tuned for the lime (primary-fixed) advise card. */
const TONE_STYLE: Record<CoachPillTone, { readonly chip: string; readonly label: string; readonly tint: string }> = {
  calm: { chip: "bg-on-primary-fixed/15", label: "text-on-primary-fixed", tint: color.onPrimaryFixed },
  push: { chip: "bg-on-primary-fixed", label: "text-primary-fixed", tint: color.primaryFixed },
  alert: { chip: "bg-error-container", label: "text-on-error-container", tint: color.onErrorContainer },
  win: { chip: "bg-on-primary-fixed/15 border border-on-primary-fixed", label: "text-on-primary-fixed", tint: color.onPrimaryFixed },
};

/** Pill ids come from the API (`coach-pills.ts`). Unknown ids are display-only. */
const FUEL_PILL_IDS = new Set(["fuel_check", "protein_gap", "eat_up"]);

/** Horizontal mood/intent chips under the coach message. Each tap routes somewhere useful. */
export const AiMoodPills = ({ pills, onSetReadiness, onSelectVector }: Props) => {
  if (pills.length === 0) return null;

  const handlePillPress = (pill: CoachPill) => {
    if (FUEL_PILL_IDS.has(pill.id)) {
      router.push("/(tabs)/fuel");
      return;
    }
    if (pill.id === "recover") {
      onSetReadiness("rest");
      return;
    }
    if (pill.id === "recalibrate" || pill.id === "restart") {
      onSelectVector("missed");
      return;
    }
    if (pill.id === "on_track") {
      router.push("/(tabs)/today");
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={sx("gap-space-sm pr-space-sm")}
      style={sx("mt-space-sm")}
      accessibilityLabel="Coach focus"
    >
      {pills.map((pill) => {
        const style = TONE_STYLE[pill.tone];
        return (
          <Pressable
            key={pill.id}
            accessibilityRole="button"
            accessibilityLabel={pill.label}
            hitSlop={6}
            onPress={() => handlePillPress(pill)}
            style={sx(`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${style.chip}`)}
          >
            {pill.tone === "win" ? <Check size={14} color={style.tint} /> : null}
            <Text style={sx(`font-label text-label-md ${style.label}`)}>{pill.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
