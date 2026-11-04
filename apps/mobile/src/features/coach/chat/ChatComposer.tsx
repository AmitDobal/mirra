import { ArrowUp, Lock, Mic } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputInstance, View } from "react-native";

import { planChatCopy } from "@/content/plan-chat";
import { color, font, radius } from "@/theme/tokens";

import { alpha, hairline } from "../proposal/proposal-styles";

const MAX_LEN = 2000;
const copy = planChatCopy.composer;

type Props = {
  readonly value: string;
  readonly onChange: (text: string) => void;
  readonly onSend: () => void;
  /** A proposal waits for Yes / Change it: input shows "Reply after you decide…" + lock. */
  readonly locked: boolean;
  readonly canSend: boolean;
  readonly bottomInset: number;
};

/**
 * S39 bottom composer: dark pill input (lock while a proposal is pending), 48pt mic and
 * send circles on surface-container-low. The mic opens the keyboard, whose own mic key
 * dictates (no speech SDK in the app yet).
 */
export const ChatComposer = ({ value, onChange, onSend, locked, canSend, bottomInset }: Props) => {
  const input = useRef<TextInputInstance>(null);
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + 12 }]}>
      <View style={styles.pill}>
        <TextInput
          ref={input}
          accessibilityLabel={copy.inputLabel}
          accessibilityState={{ disabled: locked }}
          editable={!locked}
          placeholder={locked ? copy.locked : copy.placeholder}
          placeholderTextColor={alpha(color.onSurfaceVariant, 0.7)}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          maxLength={MAX_LEN}
          returnKeyType="send"
          style={styles.input}
        />
        {locked ? <Lock size={18} color={alpha(color.onSurfaceVariant, 0.7)} /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.mic}
        accessibilityHint={copy.micHint}
        accessibilityState={{ disabled: locked }}
        disabled={locked}
        onPress={() => input.current?.focus()}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        <Mic size={20} color={color.onSurface} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.send}
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
      >
        <ArrowUp size={20} color={color.onSurface} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: hairline,
  },
  pill: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: hairline,
    backgroundColor: color.surfaceContainerLow,
  },
  input: {
    flex: 1,
    height: 46,
    fontFamily: font.body,
    fontSize: 13,
    color: color.onSurface,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: hairline,
    backgroundColor: color.surfaceContainerLow,
  },
  pressed: { transform: [{ scale: 0.95 }] },
});
