import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { View } from "react-native";

import { useOnboardingStore } from "@/features/onboarding";
import { usePersonaStore } from "@/features/trainer";
import { getAuthUserId, hasSession, isPaywallSoftSkipped } from "@/lib/auth";
import {
  isEntitledStatus,
  resolveTabGuard,
} from "@/lib/auth/cold-start-route";
import {
  resolveEffectiveEntitlementStatus,
  syncEntitlementFromMeCache,
} from "@/lib/auth/tab-entitlement";
import { useEntitlementStore } from "@/stores/entitlement-store";
import { useMeStore } from "@/stores/me-store";
import { sx } from "@/theme/sx";
import { TabsStack } from "@/ui/nav";
import { TabDock } from "@/ui/TabDock";

const hideDock = (path: string) =>
  /log-meal|meal-snap|rebuild|compare|plan-chat|exercise-detail|\/coach$/.test(path);

/**
 * Tab shell with floating pill dock (hidden on modal tab routes).
 * Hard guard: session + onboarded + entitled (trial counts). `__DEV__` may soft-skip paywall.
 */
const TabsLayout = () => {
  const path = usePathname();
  const onboarded = useOnboardingStore((s) => s.completed);
  const zustandStatus = useEntitlementStore((s) => s.status);
  const meStatus = useMeStore((s) => s.me?.entitlement?.status);
  const cachedStatus = useMeStore((s) => s.cachedEntitlement?.status);
  const meEntitlement = meStatus ?? cachedStatus;
  const entitlementStatus = resolveEffectiveEntitlementStatus(
    zustandStatus,
    meEntitlement,
  );

  useLayoutEffect(() => {
    syncEntitlementFromMeCache();
  }, [zustandStatus, meEntitlement]);

  // Trainer persona: server wins on app start and after each sign-in (new session user).
  const sessionUserId = hasSession() ? getAuthUserId() : null;
  useEffect(() => {
    if (!sessionUserId || !onboarded) return;
    void usePersonaStore.getState().hydrate({ force: true });
  }, [sessionUserId, onboarded]);
  const blocked = resolveTabGuard({
    hasSession: hasSession(),
    onboarded,
    entitled: isEntitledStatus(entitlementStatus),
    devPaywallSkip: isPaywallSoftSkipped(),
  });
  if (blocked) return <Redirect href={blocked as Href} />;

  const showDock = !hideDock(path);

  return (
    <View style={sx("flex-1 bg-background")}>
      <View style={sx("flex-1")}>
        <TabsStack />
      </View>
      {showDock ? <TabDock /> : null}
    </View>
  );
};

export default TabsLayout;
