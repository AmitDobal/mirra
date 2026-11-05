import { RefreshCw } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { profileCopy } from "@/content/profile";
import { openRebuild } from "@/features/coach/open-rebuild";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = { readonly onDismiss: () => void };

/** Inline offer after a plan-affecting edit. Opens the existing S21 rebuild flow; never auto-runs it. */
export const RebuildPrompt = ({ onDismiss }: Props) => {
  const c = profileCopy.rebuild;
  return (
    <View
      accessibilityRole="alert"
      style={sx("mt-3 rounded-[24px] border border-primary-fixed/40 bg-surface-container-low p-4")}
    >
      <View style={sx("flex-row items-start gap-3")}>
        <RefreshCw size={18} color={color.primaryFixed} />
        <View style={sx("min-w-0 flex-1")}>
          <Text style={sx("font-body-medium text-body-md text-on-surface")}>{c.title}</Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{c.body}</Text>
        </View>
      </View>
      <View style={sx("mt-3 flex-row justify-end gap-2")}>
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={sx("h-10 items-center justify-center rounded-full px-4")}
        >
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>{c.dismiss}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rebuild your plan"
          onPress={() => {
            onDismiss();
            openRebuild("/rebuild");
          }}
          style={sx("h-10 items-center justify-center rounded-full bg-primary-fixed px-5")}
        >
          <Text style={sx("font-label text-label-md text-on-primary-fixed")}>{c.cta}</Text>
        </Pressable>
      </View>
    </View>
  );
};
