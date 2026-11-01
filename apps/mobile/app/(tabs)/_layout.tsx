import { Redirect, Slot, usePathname, type Href } from "expo-router";
import { View } from "react-native";

import { useOnboardingStore } from "@/features/onboarding";
import { hasSession, isPaywallSoftSkipped } from "@/lib/auth";
import {
  isEntitledStatus,
  resolveTabGuard,
} from "@/lib/auth/cold-start-route";
import { useEntitlementStore } from "@/stores/entitlement-store";
import { sx } from "@/theme/sx";
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
  const entitlementStatus = useEntitlementStore((s) => s.status);
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
        <Slot />
      </View>
      {showDock ? <TabDock /> : null}
    </View>
  );
};

export default TabsLayout;
