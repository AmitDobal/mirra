import { Slot, usePathname } from "expo-router";
import { View } from "react-native";

import { TabDock } from "@/ui/TabDock";

const hideDock = (path: string) =>
  /log-meal|rebuild|compare/.test(path);

/** Tab shell with floating pill dock (hidden on modal tab routes). */
const TabsLayout = () => {
  const path = usePathname();
  const showDock = !hideDock(path);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <Slot />
      </View>
      {showDock ? <TabDock /> : null}
    </View>
  );
};

export default TabsLayout;
