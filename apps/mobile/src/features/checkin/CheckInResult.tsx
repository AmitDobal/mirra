import { ArrowRight, BadgeCheck, SlidersHorizontal, X } from "lucide-react-native";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { s20cAdjustToday } from "../../../assets/stitch";
import { timing } from "@/features/fuel/snap/motion";
import { color, space } from "@/theme/tokens";

import { ImpactPair, WorkoutDiffCard } from "./DiffCards";
import { ProposalPills } from "./ProposalPills";
import { PressScale } from "./PressScale";
import { ScrimGradient } from "./ScrimGradient";
import { sorenessSummary, titleCase } from "./checkin-logic";
import { useCheckInStore } from "./checkin-store";
import { styles } from "./CheckInResult.styles";

const PULSE_MS = 1100;

type Props = {
  /** Leave the flow (Today). Both CTAs and the close button end here. */
  readonly onDone: () => void;
};

const proposalTag = (mode: string, suggested: string): string => {
  if (mode === "keep") return "PLAN UNCHANGED";
  return mode === suggested ? "AUTO-APPLIED" : "APPLIED";
};

/** S20c — "We adjusted today": AI proposal, before/after diff, confirm or revert. */
export const CheckInResult = ({ onDone }: Props) => {
  const insets = useSafeAreaInsets();
  const result = useCheckInStore((s) => s.result);
  const chooseMode = useCheckInStore((s) => s.chooseMode);
  const keepOriginal = useCheckInStore((s) => s.keepOriginal);

  if (!result) return null;
  const { inputs, mode, suggested, diff } = result;
  const soreness = sorenessSummary(inputs.soreness, inputs.areas);
  const adjusted = mode !== "keep" && diff != null;

  const handleKeepOriginal = () => {
    keepOriginal();
    onDone();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space.sm,
          paddingBottom: 150 + insets.bottom,
          paddingHorizontal: space.margin,
        }}
      >
        <View style={styles.header}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onDone}
            style={styles.iconCircle}
          >
            <X size={20} color={color.onSurface} />
          </PressScale>
          <View style={styles.brandChip}>
            <MotiView
              from={{ opacity: 1 }}
              animate={{ opacity: 0.35 }}
              transition={timing({ duration: PULSE_MS, loop: true, easing: Easing.inOut(Easing.quad) })}
              style={styles.liveDot}
            />
            <Text style={styles.brandText}>Mirra Coach · Today adjusted</Text>
          </View>
          <View style={[styles.iconCircle, styles.avatar]}>
            <Image source={s20cAdjustToday.hero} style={styles.avatarImg} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={StyleSheet.absoluteFill}>
            <Image source={s20cAdjustToday.hero} style={styles.heroImg} resizeMode="cover" />
          </View>
          <View style={styles.heroDim} pointerEvents="none" />
          <ScrimGradient id="s20c-hero" />
          <View style={styles.heroTags}>
            <View style={styles.tagLive}>
              <Text style={styles.tagLiveText}>Calibration engine · realtime</Text>
            </View>
            <View style={styles.tagPlan}>
              <SlidersHorizontal size={14} color={color.secondary} />
              <Text style={styles.tagPlanText}>Dynamic Plan</Text>
            </View>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <Text style={styles.title}>{adjusted ? "We adjusted today" : "Today stays as planned"}</Text>
            <View style={styles.verified}>
              <BadgeCheck size={18} color={color.primaryContainer} />
            </View>
          </View>
          <View style={styles.pillRow}>
            <SummaryPill dot={color.primaryContainer} label="Energy" value={`${inputs.energy}/5`} />
            <SummaryPill dot={color.secondary} label="Sleep" value={SLEEP_LABEL_SHORT[inputs.sleep]} />
            <SummaryPill
              dot={color.secondaryFixedDim}
              label={soreness.text}
              value={soreness.detail ? `(${soreness.detail})` : null}
              valueTint={color.secondary}
            />
          </View>
        </View>

        {diff ? (
          <>
            <View style={styles.proposalHead}>
              <Text style={styles.proposalLabel}>Mirra proposal · tap to override</Text>
              <Text style={styles.proposalTag}>{proposalTag(mode, suggested)}</Text>
            </View>
            <ProposalPills mode={mode} onChange={chooseMode} />

          </>
        ) : null}

        <MotiView
          key={mode}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={timing({ duration: 200 })}
          style={styles.stack}
        >
          <WorkoutDiffCard diff={diff} pulseKey={mode} />
          <ImpactPair diff={diff} />
        </MotiView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <ScrimGradient id="s20c-footer" variant="dock" />
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="Looks good"
          onPress={onDone}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Looks good</Text>
          <ArrowRight size={18} color={color.onPrimaryFixed} />
        </PressScale>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keep original plan"
          onPress={handleKeepOriginal}
          hitSlop={8}
          style={styles.keep}
        >
          <Text style={styles.keepText}>Keep original plan</Text>
        </Pressable>
      </View>
    </View>
  );
};

const SLEEP_LABEL_SHORT = { poor: "Poor", ok: "OK", great: "Great" } as const;

type PillProps = {
  readonly dot: string;
  readonly label: string;
  readonly value: string | null;
  readonly valueTint?: string;
};

const SummaryPill = ({ dot, label, value, valueTint }: PillProps) => (
  <View style={styles.sumPill}>
    <View style={[styles.sumDot, { backgroundColor: dot }]} />
    <Text style={styles.sumLabel}>
      {titleCase(label)}
      {value ? (
        <Text style={[styles.sumValue, valueTint ? { color: valueTint } : null]}> {value}</Text>
      ) : null}
    </Text>
  </View>
);
