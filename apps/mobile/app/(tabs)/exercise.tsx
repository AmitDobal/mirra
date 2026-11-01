import { router } from "expo-router";
import { Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";

/**
 * Placeholder so the Exercise dock tab never 404s (AMI-141).
 * AMI-142 replaces this file with the real Exercise hub — keep the route name `exercise`.
 */
const ExercisePlaceholder = () => (
  <ScreenScroll>
    <View style={sx("gap-space-md pt-space-xl")}>
      <CapsLabel tone="lime">Exercise</CapsLabel>
      <Text style={sx("font-headline text-headline-lg text-on-surface")}>Exercise hub is coming</Text>
      <Text style={sx("font-body text-body-md text-on-surface-variant")}>
        Today&apos;s session, exercise instructions, swaps and your library will live here.
      </Text>
      <LimeCta label="Back to Today" onPress={() => router.replace("/(tabs)/today")} />
    </View>
  </ScreenScroll>
);

export default ExercisePlaceholder;
