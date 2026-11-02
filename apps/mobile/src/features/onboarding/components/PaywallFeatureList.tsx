import {
  AudioLines,
  Camera,
  Dumbbell,
  MessageSquare,
  RefreshCw,
  type LucideIcon,
} from "lucide-react-native";
import { MotiView, type MotiTransition } from "moti";
import { StyleSheet, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Tone = "lime" | "lavender";

const ICONS: Record<string, LucideIcon> = {
  aiTrainer: AudioLines,
  exerciseHub: Dumbbell,
  mealCamera: Camera,
  chatTrainer: MessageSquare,
  reshuffle: RefreshCw,
};

const FADE: MotiTransition = {
  type: "timing",
  duration: 420,
} as MotiTransition;

const PULSE: MotiTransition = {
  type: "timing",
  duration: 1400,
  loop: true,
  repeatReverse: true,
} as MotiTransition;

const iconWrap = (tone: Tone) =>
  tone === "lime"
    ? {
        backgroundColor: "rgba(203,241,80,0.15)",
        borderColor: "rgba(203,241,80,0.4)",
        icon: color.primaryFixed,
      }
    : {
        backgroundColor: "rgba(209,190,239,0.15)",
        borderColor: "rgba(209,190,239,0.4)",
        icon: color.secondary,
      };

const chipWrap = (tone: Tone) =>
  tone === "lime"
    ? {
        backgroundColor: "rgba(203,241,80,0.15)",
        borderColor: "rgba(203,241,80,0.3)",
        text: color.primaryFixed,
      }
    : {
        backgroundColor: "rgba(80,66,107,0.3)",
        borderColor: "rgba(209,190,239,0.2)",
        text: color.secondary,
      };

/** S13c highlight rows — icon circles, copy, trailing chips. */
export const PaywallFeatureList = () => (
  <View style={sx("gap-space-sm")} accessibilityLabel="Feature Highlights">
    {onboardingCopy.paywall.benefits.map((b, i) => {
      const Icon = ICONS[b.id] ?? AudioLines;
      const iconTone = iconWrap(b.iconTone);
      const chip = chipWrap(b.chipTone);
      return (
        <MotiView
          key={b.id}
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ ...FADE, delay: 80 * i } as MotiTransition}
          style={styles.row}
        >
          <View style={sx("min-w-0 flex-1 flex-row items-center gap-3.5")}>
            <MotiView
              from={{ opacity: 0.65 }}
              animate={{ opacity: 1 }}
              transition={{ ...PULSE, delay: 120 * i } as MotiTransition}
              style={[
                styles.iconCircle,
                {
                  backgroundColor: iconTone.backgroundColor,
                  borderColor: iconTone.borderColor,
                },
              ]}
            >
              <Icon color={iconTone.icon} size={20} strokeWidth={2} />
            </MotiView>
            <View style={sx("min-w-0 flex-1")}>
              <Text style={sx("font-label text-label-lg text-primary")} numberOfLines={1}>
                {b.title}
              </Text>
              <Text
                style={sx("mt-0.5 font-body text-body-sm text-on-surface-variant")}
                numberOfLines={1}
              >
                {b.sub}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.chip,
              { backgroundColor: chip.backgroundColor, borderColor: chip.borderColor },
            ]}
          >
            <Text
              style={[
                sx("font-label-bold text-[10px] uppercase"),
                { color: chip.text },
              ]}
            >
              {b.chip}
            </Text>
          </View>
        </MotiView>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
});
