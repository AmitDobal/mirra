import { LogOut, Trash2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { Divider, Group, Row, StatusRow } from "./you-settings";

type Props = {
  readonly accountLabels: readonly string[];
  readonly onPrivacy: () => void;
  readonly onTerms: () => void;
  readonly onSignOut: () => void;
  readonly onDeleteAccount: () => void;
  readonly deleting?: boolean;
};

/** Connected accounts + hardware + legal + sign out + delete account. */
export const YouFooterGroups = ({
  accountLabels,
  onPrivacy,
  onTerms,
  onSignOut,
  onDeleteAccount,
  deleting = false,
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

    <Group title="Danger zone">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        accessibilityState={{ disabled: deleting, busy: deleting }}
        disabled={deleting}
        onPress={onDeleteAccount}
        style={sx("flex-row items-center gap-space-sm px-space-md pt-space-md")}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={color.error} />
        ) : (
          <Trash2 size={16} color={color.error} />
        )}
        <Text style={sx("font-label-bold text-label-lg text-error")}>
          {deleting ? "Deleting…" : "Delete account"}
        </Text>
      </Pressable>
      <Text style={sx("px-space-md pb-space-md pt-1 font-body text-body-sm text-on-surface-variant")}>
        Permanently erases your account, meals, workouts and photos.
      </Text>
    </Group>
  </>
);
