import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly failed: boolean;
  readonly onRetry: () => void;
};

/** Placeholder for the hero + checklist area while `/v1/today/actions` loads or fails. */
export const TodayActionsPending = ({ failed, onRetry }: Props) => (
  <View
    accessibilityLabel={failed ? "Next action unavailable" : "Loading next action"}
    style={sx("mb-space-md rounded-lg bg-surface-container-high p-space-md")}
  >
    <CapsLabel>{failed ? "Next action" : "Checking today"}</CapsLabel>
    <Text style={sx("mt-1 font-headline text-headline-md text-on-surface")}>
      {failed ? "Couldn't load your next step" : "Lining up your next step"}
    </Text>
    {failed ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading next action"
        onPress={onRetry}
        style={sx("mt-space-md items-center rounded-full bg-primary-fixed py-space-sm")}
      >
        <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>Try again</Text>
      </Pressable>
    ) : (
      <View style={sx("mt-space-md items-start")}>
        <ActivityIndicator color={color.primaryFixed} />
      </View>
    )}
  </View>
);
