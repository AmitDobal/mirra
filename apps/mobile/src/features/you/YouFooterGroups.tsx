import { LogOut } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { Divider, Group, Row, StatusRow } from "./you-settings";

type Props = {
  readonly accountLabels: readonly string[];
  readonly onPrivacy: () => void;
  readonly onTerms: () => void;
  readonly onSignOut: () => void;
};

/** Connected accounts + hardware + legal + sign out. */
export const YouFooterGroups = ({
  accountLabels,
  onPrivacy,
  onTerms,
  onSignOut,
}: Props) => (
  <>
    <Group title="Connected accounts">
      {accountLabels.length > 0 ? (
        accountLabels.map((label, i) => (
          <View key={label}>
            {i > 0 ? <Divider /> : null}
            <StatusRow title={label} meta="Connected" />
          </View>
        ))
      ) : (
        <StatusRow title="No linked accounts" meta="None" />
      )}
    </Group>

    <Group title="Connected">
      <StatusRow title="Apple Health / Watch" meta="Soon" soon />
      <Divider />
      <StatusRow title="Withings Body Scan" meta="Soon" soon />
      <Divider />
      <StatusRow title="USDA & Vision Scanner" meta="Ready" />
    </Group>

    <Group title="Legal">
      <Row title="Privacy Policy" meta="Open in browser" onPress={onPrivacy} />
      <Divider />
      <Row title="Terms of Use" meta="Open in browser" onPress={onTerms} />
    </Group>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      onPress={onSignOut}
      style={sx("mt-space-md flex-row items-center justify-center gap-space-sm py-space-md")}
    >
      <LogOut size={16} color={color.error} />
      <Text style={sx("font-label-bold text-label-lg text-error")}>Sign out</Text>
    </Pressable>
  </>
);
