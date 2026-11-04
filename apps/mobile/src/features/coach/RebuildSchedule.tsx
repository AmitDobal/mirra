import { BedDouble } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { rebuildCopy as t } from "@/content/rebuild";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import type { OriginalRow, RebuildRow } from "./rebuild-view";

type Props = {
  readonly rows: readonly RebuildRow[];
  readonly original: readonly OriginalRow[];
  readonly loading: boolean;
};

type ScheduleView = "rebuilt" | "original";

/** S21 "Schedule Comparison": toggle + Adaptive Rebuild card + Original Schedule card. */
export const RebuildSchedule = ({ rows, original, loading }: Props) => {
  const [view, setView] = useState<ScheduleView>("rebuilt");
  const rebuiltCard = <RebuiltCard rows={rows} loading={loading} dim={view === "original"} />;
  const originalCard =
    original.length > 0 ? <OriginalCard rows={original} dim={view === "rebuilt"} /> : null;

  return (
    <View style={sx("mb-space-lg")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <CapsLabel style={styles.secondary}>{t.compareTitle}</CapsLabel>
        <View style={sx("flex-row rounded-full bg-surface-container-high p-1")}>
          <ToggleChip label={t.toggleRebuilt} active={view === "rebuilt"} onPress={() => setView("rebuilt")} />
          <ToggleChip label={t.togglePrevious} active={view === "original"} onPress={() => setView("original")} />
        </View>
      </View>
      <View style={sx("gap-space-md")}>
        {view === "rebuilt" ? rebuiltCard : originalCard}
        {view === "rebuilt" ? originalCard : rebuiltCard}
      </View>
    </View>
  );
};

const ToggleChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={sx(`rounded-full px-3 py-1 ${active ? "bg-primary-container" : ""}`)}
  >
    <CapsLabel style={{ color: active ? color.onPrimaryContainer : color.onSurfaceVariant }}>{label}</CapsLabel>
  </Pressable>
);

const RebuiltCard = ({ rows, loading, dim }: { rows: readonly RebuildRow[]; loading: boolean; dim: boolean }) => (
  <View style={sx(`rounded-lg bg-surface-container p-space-md ${dim ? "opacity-60" : ""}`)}>
    <View style={sx("mb-3 flex-row items-center justify-between")}>
      <View style={sx("flex-row items-center gap-2")}>
        <View style={sx("h-2 w-2 rounded-full bg-primary-container")} />
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{t.rebuiltTitle}</Text>
      </View>
      <View style={sx("rounded-full bg-primary-container px-2 py-0.5")}>
        <CapsLabel style={{ color: color.onPrimaryContainer }}>{t.recommended}</CapsLabel>
      </View>
    </View>
    {loading ? (
      <View style={sx("items-center py-space-lg")}>
        <ActivityIndicator color={color.primaryFixed} />
      </View>
    ) : rows.length === 0 ? (
      <Text style={sx("font-body text-body-md text-on-surface-variant")}>{t.emptyDays}</Text>
    ) : (
      <View style={sx("gap-2.5")}>
        {rows.map((r) => (
          <RebuiltRowView key={r.date} row={r} />
        ))}
      </View>
    )}
  </View>
);

const RebuiltRowView = ({ row }: { row: RebuildRow }) => {
  const tagColor = row.isToday ? color.primaryContainer : row.isRest ? color.secondary : color.onSurface;
  return (
    <View
      style={sx(
        `flex-row items-center justify-between gap-3 rounded-DEFAULT p-3 ${
          row.isRest ? "bg-surface-container-lowest" : "bg-surface-container-high"
        }`,
      )}
    >
      <View style={sx("min-w-0 flex-1 flex-row items-center gap-3")}>
        <View
          style={sx(
            `h-11 w-11 items-center justify-center rounded-full ${
              row.isRest ? "bg-surface-container" : "bg-surface-container-lowest"
            }`,
          )}
        >
          <CapsLabel>{row.weekday}</CapsLabel>
          <Text style={[sx("font-label-md text-label-md uppercase"), styles.tag, { color: tagColor }]}>
            {row.tag}
          </Text>
        </View>
        <View style={sx("min-w-0 flex-1")}>
          <View style={sx("flex-row items-center gap-1.5")}>
            <Text style={[sx("font-body-lg text-body-lg text-on-surface"), styles.shrink]} numberOfLines={2}>
              {row.title}
            </Text>
            {row.changed && !row.isRest ? <View style={sx("h-1.5 w-1.5 rounded-full bg-primary-container")} /> : null}
          </View>
          {row.note ? (
            <Text
              style={sx(`font-body text-body-sm ${row.changed ? "text-primary-fixed-dim" : "text-on-surface-variant"}`)}
              numberOfLines={2}
            >
              {row.note}
            </Text>
          ) : null}
        </View>
      </View>
      {row.minutes != null ? (
        <View
          style={sx(
            `rounded-full px-2.5 py-1 ${row.changed ? "bg-primary-container" : "bg-surface-container-lowest"}`,
          )}
        >
          <Text
            style={[
              sx("font-label-md text-label-md"),
              { color: row.changed ? color.onPrimaryContainer : color.onSurface },
            ]}
          >
            {t.minutes(row.minutes)}
          </Text>
        </View>
      ) : (
        <BedDouble size={20} color={color.secondary} />
      )}
    </View>
  );
};

const OriginalCard = ({ rows, dim }: { rows: readonly OriginalRow[]; dim: boolean }) => (
  <View style={sx(`rounded-lg bg-surface-container-lowest p-space-md ${dim ? "opacity-60" : ""}`)}>
    <View style={sx("mb-3 flex-row items-center justify-between")}>
      <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{t.originalTitle}</Text>
      <View style={sx("rounded-full bg-surface-container-high px-2 py-0.5")}>
        <CapsLabel>{t.outdated}</CapsLabel>
      </View>
    </View>
    <View style={sx("gap-2")}>
      {rows.map((r) => {
        const tone = r.changed ? color.error : color.onSurfaceVariant;
        return (
          <View
            key={r.date}
            style={sx("flex-row items-center justify-between gap-3 rounded-DEFAULT bg-surface-container-low p-2.5")}
          >
            <View style={sx("min-w-0 flex-1 flex-row items-center gap-3")}>
              <CapsLabel style={[styles.day, { color: tone }]}>{r.weekday}</CapsLabel>
              <Text
                style={[sx("font-body text-body-md text-on-surface-variant"), styles.shrink, r.changed && styles.strike]}
                numberOfLines={1}
              >
                {r.title}
              </Text>
            </View>
            <CapsLabel style={{ color: r.changed ? color.error : r.minutes != null ? color.onSurface : tone }}>
              {r.changed ? t.changed : r.minutes != null ? t.minutes(r.minutes) : t.rest}
            </CapsLabel>
          </View>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  secondary: { color: color.secondary },
  tag: { fontSize: 10, lineHeight: 12 },
  day: { width: 32, textAlign: "center" },
  strike: { textDecorationLine: "line-through" },
  shrink: { flexShrink: 1 },
});
