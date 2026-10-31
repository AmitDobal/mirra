import { Slot, usePathname } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { usePersonaStore } from "@/features/trainer";
import { TabDock } from "@/ui/TabDock";
import { sx } from "@/theme/sx";

const hideDock = (path: string) =>
  /log-meal|rebuild|compare|plan-chat/.test(path);

/** Tab shell with floating pill dock (hidden on modal tab routes). */
const TabsLayout = () => {
  const path = usePathname();
  const showDock = !hideDock(path);
  const hydratePersona = usePersonaStore((s) => s.hydrate);

  useEffect(() => {
    void hydratePersona();
  }, [hydratePersona]);

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
