import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, radius, space } from "@/theme/tokens";

type Props = {
  readonly visible: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
};

/** Bottom sheet shell shared by the portion + fix sheets (keyboard aware). */
export const SheetFrame = ({ visible, title, onClose, children }: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
          onPress={onClose}
          style={styles.backdrop}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { paddingBottom: space.md + insets.bottom }]}
          >
            <CapsLabel>{title}</CapsLabel>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    backgroundColor: color.surfaceContainerLow,
    padding: space.md,
  },
});
