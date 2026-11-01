import { CameraOff, CloudOff, ScanSearch, TriangleAlert } from "lucide-react-native";
import { MotiView } from "moti";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { color, font, radius, space } from "@/theme/tokens";

import type { SnapFailure } from "./snap-errors";
import { spring } from "./motion";

const ICONS = {
  permission: CameraOff,
  credits: TriangleAlert,
  network: CloudOff,
  unreadable: ScanSearch,
  generic: TriangleAlert,
} as const;

type Props = {
  readonly failure: SnapFailure;
  readonly onRetry: () => void;
  readonly onDescribe: () => void;
  readonly onManual: () => void;
  readonly onClose: () => void;
};

/** Estimate failed: say why, offer retry / describe / manual log. */
export const FailView = ({ failure, onRetry, onDescribe, onManual, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const Icon = ICONS[failure.kind];
  const canRetry = failure.kind !== "credits" && failure.kind !== "permission";
  const canDescribe = failure.kind !== "credits";

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <View style={styles.body}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring({ damping: 14 })}
          style={styles.iconWrap}
        >
          <Icon size={30} color={color.error} />
        </MotiView>
        <CapsLabel tone="alert">Mirra Vision</CapsLabel>
        <Text style={styles.title}>{failure.title}</Text>
        <Text style={styles.text}>{failure.body}</Text>
      </View>
      <View style={styles.actions}>
        {canRetry ? <LimeCta label="Try again" onPress={onRetry} /> : null}
        {canDescribe ? (
          <LimeCta label="Describe instead" variant="dark" onPress={onDescribe} />
        ) : null}
        <LimeCta label="Log manually" variant="ghost" onPress={onManual} />
        <LimeCta label="Close" variant="ghost" onPress={onClose} style={styles.close} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface,
    paddingHorizontal: space.margin,
    justifyContent: "space-between",
  },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${color.errorContainer}66`,
    marginBottom: space.sm,
  },
  title: { fontFamily: font.headline, fontSize: 24, textAlign: "center", color: color.onSurface },
  text: {
    maxWidth: 300,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 20,
    color: color.onSurfaceVariant,
  },
  actions: { gap: space.sm },
  close: { height: 44 },
});
