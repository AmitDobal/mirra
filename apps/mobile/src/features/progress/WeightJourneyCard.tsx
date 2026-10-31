import { Scale } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { LogWeightSheet } from "./LogWeightSheet";
import { WeightSparkline } from "./WeightSparkline";
import { computeWeightStats, formatDelta, formatKg } from "./weight-journey";
import { useWeightStore } from "./weight-store";

/** Progress tab: weight sparkline, latest kg, delta vs first + vs goal, Log weight sheet. */
export const WeightJourneyCard = () => {
  const entries = useWeightStore((s) => s.entries);
  const goalKg = useWeightStore((s) => s.goalKg);
  const logging = useWeightStore((s) => s.logging);
  const hydrate = useWeightStore((s) => s.hydrate);
  const logWeight = useWeightStore((s) => s.logWeight);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleSubmit = useCallback(
    async (kg: number) => {
      if (await logWeight(kg)) setOpen(false);
    },
    [logWeight],
  );

  const stats = computeWeightStats(entries, goalKg);

  return (
    <View style={sx("mb-space-md rounded-lg bg-surface-container-low p-space-md")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <CapsLabel>Weight journey</CapsLabel>
        <Scale size={14} color={color.onSurfaceVariant} />
      </View>

      {stats.latestKg === null ? (
        <Text style={sx("font-body text-body-md text-on-surface-variant")}>
          Log your weight to start your journey.
        </Text>
      ) : (
        <>
          <Text style={sx("font-display text-headline-lg text-primary-fixed")}>
            {formatKg(stats.latestKg)}
          </Text>
          <View style={sx("my-space-sm")}>
            <WeightSparkline values={stats.series} />
          </View>
          <View style={sx("flex-row gap-space-sm")}>
            <DeltaTile
              label="Since start"
              value={stats.deltaFromFirstKg === null ? "—" : formatDelta(stats.deltaFromFirstKg)}
            />
            <DeltaTile
              label="To goal"
              value={
                stats.deltaToGoalKg === null
                  ? "Set a goal"
                  : stats.deltaToGoalKg === 0
                    ? "Goal reached"
                    : formatDelta(stats.deltaToGoalKg)
              }
              sub={goalKg === null ? undefined : `Goal ${formatKg(goalKg)}`}
            />
          </View>
        </>
      )}

      <LimeCta label="Log weight" onPress={handleOpen} style={sx("mt-space-md")} />

      <LogWeightSheet
        visible={open}
        saving={logging}
        initialKg={stats.latestKg}
        onClose={handleClose}
        onSubmit={(kg) => void handleSubmit(kg)}
      />
    </View>
  );
};

const DeltaTile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View style={sx("flex-1 rounded-lg bg-surface-container-high p-space-md")}>
    <CapsLabel>{label}</CapsLabel>
    <Text style={sx("mt-1 font-display text-headline-md text-on-surface")}>{value}</Text>
    {sub ? <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{sub}</Text> : null}
  </View>
);
