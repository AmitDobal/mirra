import { Slot, usePathname } from "expo-router";
import { View } from "react-native";

import { sx } from "@/theme/sx";
import { TabDock } from "@/ui/TabDock";

const hideDock = (path: string) =>
  /log-meal|rebuild|compare|plan-chat/.test(path);

/** Tab shell with floating pill dock (hidden on modal tab routes). */
const TabsLayout = () => {
  const path = usePathname();
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
