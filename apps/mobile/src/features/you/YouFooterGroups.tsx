import { LogOut, Trash2 } from "lucide-react-native";
import { Fragment } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { profileCopy } from "@/content/profile";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

import { Card, Divider, Group, StatusRow, ValueRow } from "./you-settings";
import { t } from "./you-text";

type Props = {
  /** "Pro · Active", "Plan v2 · active", … */
  readonly subscriptionLine: string;
  readonly onManageSub: () => void;
  readonly accountLabels: readonly string[];
  readonly onPrivacy: () => void;
  readonly onTerms: () => void;
  readonly onSignOut: () => void;
  readonly onDeleteAccount: () => void;
  readonly deleting?: boolean;
};

/** S41 Account (subscription + linked providers), Connected, Legal, Sign out, Danger zone. */
export const YouFooterGroups = ({
  subscriptionLine,
  onManageSub,
  accountLabels,
  onPrivacy,
  onTerms,
  onSignOut,
  onDeleteAccount,
  deleting = false,
}: Props) => (
  <>
    <Group title={profileCopy.sections.account}>
      <ValueRow
        title={profileCopy.subscription}
        sub={subscriptionLine}
        value={profileCopy.manage}
        onPress={onManageSub}
      />
      {accountLabels.length > 0 ? (
        accountLabels.map((label) => (
          <Fragment key={label}>
            <Divider />
            <StatusRow title={label} meta="Connected" />
          </Fragment>
        ))
      ) : (
        <>
          <Divider />
          <StatusRow title="No linked accounts" meta="None" soon />
        </>
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
      <ValueRow title="Privacy Policy" value="Open in browser" onPress={onPrivacy} />
      <Divider />
      <ValueRow title="Terms of Use" value="Open in browser" onPress={onTerms} />
    </Group>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      onPress={onSignOut}
      style={sx("mt-6 h-12 flex-row items-center justify-center gap-2 self-center px-6")}
    >
      <LogOut size={18} color={color.error} />
      <Text style={t.signOut}>Sign out</Text>
    </Pressable>

    <View style={sx("mt-4")}>
      <CapsLabel style={sx("mb-2 px-1")}>Danger zone</CapsLabel>
      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityState={{ disabled: deleting, busy: deleting }}
          disabled={deleting}
          onPress={onDeleteAccount}
          style={sx("p-4")}
        >
          <View style={sx("flex-row items-center gap-2")}>
            {deleting ? <ActivityIndicator size="small" color={color.error} /> : <Trash2 size={18} color={color.error} />}
            <Text style={t.signOut}>{deleting ? "Deleting…" : "Delete account"}</Text>
          </View>
          <Text style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 6 }]}>
            Permanently erases your account, meals, workouts and photos.
          </Text>
        </Pressable>
      </Card>
    </View>
  </>
);
