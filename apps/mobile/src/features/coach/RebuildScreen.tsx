import { router } from "expo-router";
import { ArrowRight, BadgeCheck, RefreshCw, User, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { rebuildCopy as t } from "@/content/rebuild";
import { localTodayIso } from "@/lib/datetime";
import { openProUpsell } from "@/features/you/AiLimitSheet";
import { usePlanStore } from "@/stores/plan-store";
import { useIsPro } from "@/stores/pro-access";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { useColdBackFallback } from "@/ui/nav/use-cold-back";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { useCoachStore } from "./coach-store";
import { RebuildAdaptCard, RebuildCoachCard, RebuildMetricsRow } from "./RebuildCards";
import { RebuildSchedule } from "./RebuildSchedule";
import { changeSummary, originalRows, rebuildMetrics, rebuildRows } from "./rebuild-view";

/** S21 Rebuild preview: real POST /v1/plans/rebuild/preview, before vs after, Apply commits. */
export const RebuildScreen = () => {
  const preview = useCoachStore((s) => s.preview);
  const apply = useCoachStore((s) => s.apply);
  const keep = useCoachStore((s) => s.keep);
  const after = useCoachStore((s) => s.previewAfter);
  const storedBefore = useCoachStore((s) => s.previewBefore);
  const token = useCoachStore((s) => s.previewToken);
  const loading = useCoachStore((s) => s.previewLoading);
  const error = useCoachStore((s) => s.previewError);
  const current = usePlanStore((s) => s.plan);
  const [busy, setBusy] = useState(false);

  const pro = useIsPro();
  useEffect(() => {
    // Cold link / stale entry by a free user: upsell instead of a preview the API won't apply.
    if (!pro) {
      openProUpsell();
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/today");
      return;
    }
    void preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const before = storedBefore ?? current;
  const today = localTodayIso();
  const view = useMemo(() => {
    const rows = rebuildRows(after, before, today);
    return {
      rows,
      original: after ? originalRows(before, after, today) : [],
      metrics: rebuildMetrics(after ?? before, before, today),
      summary: changeSummary(rows),
      shifts: rows.filter((r) => r.changed).length,
    };
  }, [after, before, today]);
  const outcome = after?.summary?.outcomeLine;

  const close = async () => {
    if (busy) return;
    await keep();
    router.replace("/(tabs)/today");
  };
  // Cold /rebuild (no history): hardware back behaves like Close instead of exiting the app.
  useColdBackFallback(() => void close());

  const handleApply = async () => {
    if (busy || !token) return;
    setBusy(true);
    const ok = await apply();
    setBusy(false);
    if (ok) router.replace("/(tabs)/today");
  };

  const ctaLabel = busy ? t.applying : loading ? t.heroLoading : t.apply;

  return (
    <ScreenScroll dockPad={false}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => void close()}
            style={sx("h-11 w-11 items-center justify-center rounded-full")}
          >
            <X size={24} color={color.onSurface} />
          </Pressable>
          <View>
            <CapsLabel style={styles.secondary}>{t.eyebrow}</CapsLabel>
            <Text style={sx("font-headline-sm text-headline-sm uppercase text-on-surface")}>{t.title}</Text>
          </View>
        </View>
        <View style={sx("h-8 w-8 items-center justify-center rounded-full bg-primary")}>
          <User size={18} color={color.onPrimary} />
        </View>
      </View>

      <View style={sx("mb-space-md flex-row items-center justify-between py-space-sm")}>
        <View style={sx("flex-row items-center gap-2")}>
          <View style={sx("h-2.5 w-2.5 rounded-full bg-primary-container")} />
          <Text style={sx("font-headline-sm text-headline-sm uppercase text-on-surface")}>{t.metaTitle}</Text>
        </View>
        <View style={sx("flex-row items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1")}>
          <RefreshCw size={14} color={color.secondary} />
          <CapsLabel style={styles.secondary}>{t.metaBadge}</CapsLabel>
        </View>
      </View>

      <View style={sx("mb-space-lg gap-space-sm overflow-hidden rounded-lg bg-surface-container-high p-space-lg")}>
        <View style={sx("flex-row items-center gap-1.5 self-start rounded-full bg-surface-container-lowest px-2.5 py-1")}>
          <BadgeCheck size={14} color={color.primaryContainer} />
          <CapsLabel style={styles.lime}>{t.heroPill(view.metrics.volumeMatchPct)}</CapsLabel>
        </View>
        <Text style={sx("font-headline-lg text-headline-lg text-on-surface")}>{t.heroTitle}</Text>
        <Text style={sx("font-body text-body-md text-on-surface-variant")}>
          {loading ? t.heroLoading : typeof outcome === "string" && outcome ? outcome : t.heroFallback}
        </Text>
        <View style={sx("mt-1 flex-row items-center gap-3 pt-2")}>
          <View style={sx("flex-row")}>
            <View style={sx("h-6 w-6 items-center justify-center rounded-full bg-primary-container")}>
              <Text style={[sx("font-label-bold text-on-primary"), styles.initial]}>P</Text>
            </View>
            <View style={[sx("h-6 w-6 items-center justify-center rounded-full bg-secondary"), styles.overlap]}>
              <Text style={[sx("font-label-bold text-on-secondary"), styles.initial]}>R</Text>
            </View>
          </View>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            {t.shiftsLabel}
            <Text style={sx("font-body-semi text-on-surface")}>{t.shiftsValue(view.shifts)}</Text>
          </Text>
        </View>
      </View>

      <RebuildMetricsRow m={view.metrics} />
      <RebuildSchedule rows={view.rows} original={view.original} loading={loading} />
      {error ? (
        <View style={sx("mb-space-lg gap-space-sm rounded-lg bg-error-container p-space-md")}>
          <Text style={sx("font-body text-body-md text-on-error-container")}>{error}</Text>
          {!token ? (
            <Pressable accessibilityRole="button" onPress={() => void preview()} style={sx("self-start")}>
              <CapsLabel style={styles.onError}>{t.retry}</CapsLabel>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <RebuildCoachCard message={loading ? t.heroLoading : view.summary} />
      <RebuildAdaptCard />

      <LimeCta
        label={ctaLabel}
        onPress={() => void handleApply()}
        icon={<ArrowRight size={18} color={color.onPrimaryFixed} />}
        style={!token || busy ? styles.disabled : undefined}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.customize}
        onPress={() => router.push("/(tabs)/plan-chat")}
        style={sx("mt-space-sm h-14 items-center justify-center rounded-full bg-surface-container-high")}
      >
        <Text style={sx("font-label-bold text-label-lg text-on-surface")}>{t.customize}</Text>
      </Pressable>
    </ScreenScroll>
  );
};

const styles = StyleSheet.create({
  secondary: { color: color.secondary },
  lime: { color: color.primaryContainer },
  onError: { color: color.onErrorContainer },
  initial: { fontSize: 10, lineHeight: 12 },
  overlap: { marginLeft: -6 },
  disabled: { opacity: 0.5 },
});
