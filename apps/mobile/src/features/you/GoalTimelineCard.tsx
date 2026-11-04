import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { goalCopy } from "@/content/goal";
import { GoalChart } from "@/features/goal/chart/GoalChart";
import { GoalStatusPill } from "@/features/goal/GoalStatusPill";
import { useGoalView } from "@/features/goal/use-goal-view";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

const c = goalCopy.card;

type Props = {
  /** Top margin: S45 sits 12pt under the profile card; S46 follows the page subtitle. */
  readonly style?: StyleProp<ViewStyle>;
};

/**
 * S45 (You, under ProfileCard) and S46 (Progress, above the photo pair): goal summary + 56pt
 * sparkline, opens S44 `/goal`. Hidden for users without a goal plan (not onboarded).
 */
export const GoalTimelineCard = ({ style }: Props) => {
  const { view, status } = useGoalView();
  if (view.layout === "empty" && status !== "loading") return null;
  const loading = view.layout === "empty";
  const a11y = loading ? c.loading : `${c.title}. ${view.card.title}. ${view.card.sub}. ${view.status.label}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={c.a11y}
      disabled={loading}
      onPress={() => router.push("/goal")}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <CapsLabel tone="lime">{c.title}</CapsLabel>
        <View style={styles.headerRight}>
          {loading ? null : <GoalStatusPill label={view.status.label} tone={view.status.tone} />}
          <ChevronRight size={16} color={color.onSurfaceVariant} />
        </View>
      </View>
      {loading ? (
        <Text style={styles.sub}>{c.loading}</Text>
      ) : (
        <>
          <Text numberOfLines={1} style={styles.title}>
            {view.card.title}
          </Text>
          {view.card.sub ? (
            <Text numberOfLines={1} style={styles.sub}>
              {view.card.sub}
            </Text>
          ) : null}
          {view.chart ? (
            <View style={styles.chart}>
              <GoalChart
                data={view.chart.data}
                variant="spark"
                etaWeeks={view.chart.etaWeeks}
                accessibilityLabel={view.chart.a11y}
              />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: {
    marginTop: 6,
    fontFamily: font.label,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  sub: {
    marginTop: 2,
    fontFamily: font.body,
    fontSize: type.bodySm.size,
    lineHeight: type.bodySm.line,
    color: color.onSurfaceVariant,
  },
  chart: { marginTop: 12 },
});
