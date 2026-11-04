import { Check, Pencil } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { planChatCopy } from "@/content/plan-chat";
import { color, font, radius } from "@/theme/tokens";

type Props = {
  readonly applying: boolean;
  readonly onApply: () => void;
  readonly onChange: () => void;
};

const copy = planChatCopy.card;

/** S39 footer: "Apply these to your plan?" + lavender "Change it" / lime "Yes, apply". */
export const ProposalActions = ({ applying, onApply, onChange }: Props) => (
  <View style={styles.wrap}>
    <Text style={styles.prompt}>{copy.prompt}</Text>
    <View style={styles.buttons}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.change}
        disabled={applying}
        onPress={onChange}
        style={({ pressed }) => [styles.btn, styles.ghost, (pressed || applying) && styles.dim]}
      >
        <Pencil size={18} color={color.secondary} />
        <Text style={styles.ghostText}>{copy.change}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.apply}
        accessibilityState={{ busy: applying }}
        disabled={applying}
        onPress={onApply}
        style={({ pressed }) => [styles.btn, styles.lime, pressed && styles.dim]}
      >
        {applying ? (
          <ActivityIndicator size="small" color={color.onPrimaryFixed} />
        ) : (
          <Check size={18} color={color.onPrimaryFixed} />
        )}
        <Text style={styles.limeText}>{applying ? copy.applying : copy.apply}</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 2 },
  prompt: {
    fontFamily: font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: color.onSurface,
  },
  buttons: { flexDirection: "row", gap: 12 },
  btn: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.full,
  },
  ghost: { borderWidth: 1, borderColor: color.secondary },
  lime: { backgroundColor: color.primaryFixed },
  dim: { opacity: 0.6 },
  ghostText: { fontFamily: font.label, fontSize: 14, color: color.secondary },
  limeText: { fontFamily: font.labelBold, fontSize: 14, color: color.onPrimaryFixed },
});
