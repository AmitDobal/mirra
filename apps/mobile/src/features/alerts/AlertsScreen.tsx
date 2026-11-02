import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { FILTERS, matchesFilter, unreadLabel, type AlertFilter } from "./alert-meta";
import { useAlertsStore } from "./alerts-store";
import { AlertsReminderPrefs } from "./AlertsReminderPrefs";
import { NotificationRow } from "./NotificationRow";
import { SoftAskBanner } from "./SoftAskBanner";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/today");
};

const emptyCopy = (filter: AlertFilter, hasAny: boolean): string => {
  if (!hasAny) return "Nothing here yet. Streak, workout and coach nudges will land in this inbox.";
  if (filter === "unread") return "You're caught up.";
  return "No alerts in this filter.";
};

/** S30 Alerts inbox (AMI-155): opened from the Today bell. In-app only, no push. */
export const AlertsScreen = () => {
  const items = useAlertsStore((s) => s.items);
  const unreadCount = useAlertsStore((s) => s.unreadCount);
  const nextCursor = useAlertsStore((s) => s.nextCursor);
  const prefs = useAlertsStore((s) => s.prefs);
  const loading = useAlertsStore((s) => s.loading);
  const error = useAlertsStore((s) => s.error);
  const hydrate = useAlertsStore((s) => s.hydrate);
  const loadMore = useAlertsStore((s) => s.loadMore);
  const markRead = useAlertsStore((s) => s.markRead);
  const markAllRead = useAlertsStore((s) => s.markAllRead);
  const enable = useAlertsStore((s) => s.enable);
  const dismissSoftAsk = useAlertsStore((s) => s.dismissSoftAsk);

  const [filter, setFilter] = useState<AlertFilter>("all");
  const [bannerClosed, setBannerClosed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  const visible = useMemo(() => items.filter((n) => matchesFilter(filter, n)), [items, filter]);
  const showBanner = prefs != null && prefs.inAppEnabled !== true && !bannerClosed;

  const handleNotNow = () => {
    setBannerClosed(true);
    void dismissSoftAsk();
  };

  return (
    <ScreenScroll onRefresh={hydrate} refreshing={loading && items.length > 0}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          style={sx(
            "h-10 w-10 items-center justify-center rounded-full border border-surface-container-high/50 bg-surface-container-low",
          )}
        >
          <ArrowLeft size={20} color={color.onSurface} />
        </Pressable>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>Alerts</Text>
          {unreadCount > 0 ? (
            <View style={sx("rounded-full bg-primary-fixed px-2.5 py-0.5")}>
              <Text style={sx("font-label-bold text-label-caps uppercase text-on-primary-fixed")}>
                {unreadLabel(unreadCount)} New
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark all read"
          accessibilityState={{ disabled: unreadCount === 0 }}
          disabled={unreadCount === 0}
          onPress={markAllRead}
          hitSlop={8}
          style={sx(unreadCount === 0 ? "opacity-40" : "")}
        >
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>Mark all read</Text>
        </Pressable>
      </View>

      {showBanner ? (
        <View style={sx("mb-space-md")}>
          <SoftAskBanner onEnable={() => void enable()} onNotNow={handleNotNow} />
        </View>
      ) : null}
      {prefs?.inAppEnabled === true ? <AlertsReminderPrefs /> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sx("mb-space-md grow-0")}
        contentContainerStyle={sx("gap-space-sm py-1")}
      >
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const label = f.id === "all" ? `All (${items.length})` : f.label;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter ${label}`}
              onPress={() => setFilter(f.id)}
              style={sx(
                `h-9 flex-row items-center justify-center gap-space-xs rounded-full border px-4 ${
                  active
                    ? "border-primary-fixed bg-primary-fixed"
                    : "border-surface-container-high/50 bg-surface-container-low"
                }`,
              )}
            >
              <Text
                style={sx(
                  `text-label-md ${
                    active ? "font-label-bold text-on-primary-fixed" : "font-label text-on-surface-variant"
                  }`,
                )}
              >
                {label}
              </Text>
              {f.id === "unread" && unreadCount > 0 && !active ? (
                <View style={sx("h-2 w-2 rounded-full bg-primary-fixed")} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={sx("gap-space-sm")}>
        {visible.map((item) => (
          <NotificationRow key={item.id} item={item} onRead={markRead} />
        ))}
        {visible.length === 0 ? (
          <Text style={sx("py-space-lg text-center font-body text-body-md text-on-surface-variant")}>
            {error ? "Could not load alerts. Pull to retry." : emptyCopy(filter, items.length > 0)}
          </Text>
        ) : null}
        {nextCursor ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load older alerts"
            onPress={() => void loadMore()}
            style={sx("items-center py-space-md")}
          >
            <Text style={sx("font-label text-label-md text-primary-fixed")}>Load older</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={sx("mt-space-lg items-center gap-space-xs border-t border-surface-container-high/30 pt-space-lg")}>
        <View style={sx("flex-row items-center gap-space-xs")}>
          <Lock size={14} color={color.onSurfaceVariant} />
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            Push notifications coming later. These stay in Mirra.
          </Text>
        </View>
      </View>
    </ScreenScroll>
  );
};
