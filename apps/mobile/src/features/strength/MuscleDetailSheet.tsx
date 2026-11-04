import type { MuscleId, TierStanding } from "@mirra/contracts";
import { X } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strengthCopy } from "@/content/strength";
import { MUSCLE_LABEL } from "@/features/anatomy";
import { TierBadge } from "@/features/strength-ui";
import { sx } from "@/theme/sx";
import { color, font, radius, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { MuscleDetailBody } from "./MuscleDetailBody";
import { useMuscleStrength } from "./strength-store";
import { muscleDetailView, placeOf } from "./strength-view";

/** Sheet top sits 96pt under the status bar (S35: y = 140 on a 44pt status bar). */
const SHEET_TOP = 96;

type Props = {
  /** Null = closed. */
  readonly muscleId: MuscleId | null;
  /** Standing from the overview, shown while the detail loads. */
  readonly standing: TierStanding | null;
  readonly onClose: () => void;
};

/** S35 muscle detail: tier, progress to next division, next set, contributing lifts. */
export const MuscleDetailSheet = ({ muscleId, standing, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const { data, status, retry } = useMuscleStrength(muscleId);
  const name = muscleId ? MUSCLE_LABEL[muscleId] : "";
  const view = data ? muscleDetailView(data, name) : null;
  const place = view ? view.place : placeOf(standing);
  const title = view?.title ?? standing?.label ?? strengthCopy.unranked;

  return (
    <Modal visible={muscleId !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[sx("flex-1 bg-black/60"), { paddingTop: insets.top + SHEET_TOP }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TierBadge tier={place?.tier ?? null} division={place?.division ?? null} size="md" />
              <View>
                <CapsLabel>{name}</CapsLabel>
                <Text style={styles.title}>{title}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
            >
              <X size={16} strokeWidth={2.5} color={color.onSurface} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
          >
            {view ? (
              <MuscleDetailBody view={view} />
            ) : status === "error" ? (
              <View style={styles.state}>
                <Text style={styles.stateText}>{strengthCopy.errorTitle}</Text>
                <Pressable accessibilityRole="button" onPress={retry} hitSlop={8}>
                  <Text style={styles.retry}>{strengthCopy.retry}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.state}>
                <ActivityIndicator color={color.primaryContainer} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    marginBottom: 12,
    borderRadius: radius.full,
    backgroundColor: color.outlineVariant,
  },
  header: {
    paddingTop: space.xs,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { marginTop: 2, fontFamily: font.headline, fontSize: 22, lineHeight: 28, color: color.onSurface },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  closePressed: { backgroundColor: color.surfaceContainerHighest },
  state: { paddingVertical: space.xl, alignItems: "center", gap: space.sm },
  stateText: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurfaceVariant },
  retry: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.primaryContainer },
});
