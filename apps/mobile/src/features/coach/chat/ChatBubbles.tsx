import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { planChatCopy } from "@/content/plan-chat";
import { color, font, radius } from "@/theme/tokens";

import { hairline } from "../proposal/proposal-styles";

/** S39 user bubble: right, surface-container-high, radius 24 with an 8pt bottom-right tail. */
export const UserBubble = ({ text }: { readonly text: string }) => (
  <View style={styles.userRow}>
    <View style={styles.userBubble}>
      <Text style={styles.text}>{text}</Text>
    </View>
  </View>
);

/** S39 coach avatar: 32pt lime circle with "M". */
export const CoachAvatar = () => (
  <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Text style={styles.avatarText}>{planChatCopy.coachInitial}</Text>
  </View>
);

type CoachProps = {
  readonly text?: string;
  readonly warnings?: readonly string[];
  readonly children?: ReactNode;
};

/** S39 coach reply: avatar + surface-container-low bubble (8pt top-left tail), notes under it. */
export const CoachBubble = ({ text, warnings, children }: CoachProps) => (
  <View style={styles.coachRow}>
    <CoachAvatar />
    <View style={styles.coachColumn}>
      <View style={styles.coachBubble}>
        {children ?? <Text style={styles.text}>{text}</Text>}
      </View>
      {warnings?.map((w) => (
        <Text key={w} style={styles.note}>
          {w}
        </Text>
      ))}
    </View>
  </View>
);

/** Coach bubble with a spinner while the preview is drafted. */
export const CoachTyping = () => (
  <CoachBubble>
    <View style={styles.typing}>
      <ActivityIndicator color={color.primaryFixed} />
      <Text style={styles.typingText}>{planChatCopy.preparing}</Text>
    </View>
  </CoachBubble>
);

const bubble = {
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: hairline,
  padding: 16,
} as const;

const styles = StyleSheet.create({
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  userBubble: {
    ...bubble,
    maxWidth: 290,
    borderBottomRightRadius: radius.sm,
    backgroundColor: color.surfaceContainerHigh,
  },
  coachRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  coachColumn: { flexShrink: 1, maxWidth: 275, gap: 6 },
  coachBubble: {
    ...bubble,
    borderTopLeftRadius: radius.sm,
    backgroundColor: color.surfaceContainerLow,
  },
  avatar: {
    width: 32,
    height: 32,
    marginTop: 2,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primaryContainer,
  },
  avatarText: { fontFamily: font.headline, fontSize: 14, lineHeight: 18, color: color.onPrimaryFixed },
  text: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurface },
  note: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.onSurfaceVariant, paddingHorizontal: 4 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurfaceVariant },
});
