import { Brain, CircleCheck, Shield, SlidersHorizontal } from "lucide-react-native";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { s21RebuildPreview } from "../../../assets/stitch";
import { rebuildCopy as t } from "@/content/rebuild";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import type { RebuildMetrics } from "./rebuild-view";

const Metric = ({
  label,
  value,
  unit,
  foot,
  icon,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  foot: string;
  icon: ReactNode;
  tone: string;
}) => (
  <View style={sx("flex-1 justify-between rounded-DEFAULT bg-surface-container p-3")}>
    <CapsLabel numberOfLines={1}>{label}</CapsLabel>
    <View style={sx("my-1")}>
      <Text style={sx("font-headline-md text-headline-md text-on-surface")}>{value}</Text>
      <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{unit}</Text>
    </View>
    <View style={sx("flex-row items-center gap-1")}>
      {icon}
      <CapsLabel style={[styles.shrink, { color: tone }]}>{foot}</CapsLabel>
    </View>
  </View>
);

/** S21 "Net metric retention" bento: sets, burn target, recovery gap (before vs after). */
export const RebuildMetricsRow = ({ m }: { m: RebuildMetrics }) => {
  const kcalFoot = m.kcalDelta == null || m.kcalDelta === 0 ? t.balanced : t.kcalDelta(m.kcalDelta);
  const safe = m.recoveryHours == null || m.recoveryHours >= 48;
  return (
    <View style={sx("mb-space-lg")}>
      <View style={sx("mb-2 flex-row items-center justify-between px-1")}>
        <CapsLabel style={styles.secondary}>{t.metricsTitle}</CapsLabel>
        <CapsLabel>{t.metricsSide}</CapsLabel>
      </View>
      <View style={sx("flex-row gap-2")}>
        <Metric
          label={t.totalVol}
          value={String(m.sets)}
          unit={t.setsUnit}
          foot={t.volumeMatch(m.volumeMatchPct)}
          icon={<CircleCheck size={13} color={color.primaryContainer} />}
          tone={color.primaryContainer}
        />
        <Metric
          label={t.burnTarget}
          value={m.kcal != null ? m.kcal.toLocaleString("en-US") : "—"}
          unit={t.kcalUnit}
          foot={kcalFoot}
          icon={<SlidersHorizontal size={13} color={color.secondary} />}
          tone={color.secondary}
        />
        <Metric
          label={t.recovery}
          value={m.recoveryHours != null ? String(m.recoveryHours) : "—"}
          unit={t.hoursUnit}
          foot={safe ? t.safeGap : t.tightGap}
          icon={<Shield size={13} color={safe ? color.primaryContainer : color.error} />}
          tone={safe ? color.primaryContainer : color.error}
        />
      </View>
    </View>
  );
};

/** S21 lavender coach insight card. */
export const RebuildCoachCard = ({ message }: { message: string }) => (
  <View style={sx("mb-space-lg flex-row items-start gap-3 rounded-lg bg-secondary p-space-md")}>
    <View style={sx("h-8 w-8 items-center justify-center rounded-full bg-secondary-container")}>
      <Brain size={18} color={color.onSecondaryContainer} />
    </View>
    <View style={sx("min-w-0 flex-1 gap-1")}>
      <CapsLabel style={styles.onSecondary}>{t.coachLabel}</CapsLabel>
      <Text style={sx("font-body text-body-md text-on-secondary")}>{message}</Text>
    </View>
  </View>
);

/** S21 "Smart Adaptation" card with the round athlete cutout. */
export const RebuildAdaptCard = () => (
  <View style={sx("mb-4 flex-row items-center justify-between gap-3 overflow-hidden rounded-lg bg-surface-container-high p-space-md")}>
    <View style={sx("min-w-0 flex-1")}>
      <CapsLabel style={styles.lime}>{t.adaptEyebrow}</CapsLabel>
      <Text style={sx("mt-1 font-headline-sm text-headline-sm text-on-surface")}>{t.adaptTitle}</Text>
      <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>{t.adaptBody}</Text>
    </View>
    <View style={sx("h-24 w-24 overflow-hidden rounded-full bg-surface-container")}>
      <Image
        source={s21RebuildPreview.athleteStretching}
        accessibilityLabel="Athlete stretching"
        style={styles.photo}
        resizeMode="cover"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  secondary: { color: color.secondary },
  onSecondary: { color: color.onSecondary },
  lime: { color: color.primaryContainer },
  shrink: { flexShrink: 1 },
  photo: { width: "100%", height: "100%" },
});
