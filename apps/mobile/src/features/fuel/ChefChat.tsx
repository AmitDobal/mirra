import { Send } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { Chip } from "@/ui/Chip";
import { LimeCta } from "@/ui/LimeCta";

import { useChefStore } from "./chef-store";

const SUGGESTIONS = ["Make it faster", "Swap an ingredient", "Scale for 2"] as const;
const MAX_CHARS = 500;

const Bubble = ({ role, text }: { readonly role: "user" | "assistant"; readonly text: string }) => {
  const mine = role === "user";
  return (
    <View
      style={[
        sx(
          `mb-space-sm rounded-lg px-space-md py-space-sm ${
            mine ? "self-end bg-primary-fixed" : "self-start bg-surface-container-highest"
          }`,
        ),
        { maxWidth: "85%" },
      ]}
    >
      <Text
        style={sx(`font-body text-body-md ${mine ? "text-on-primary-fixed" : "text-on-surface"}`)}
      >
        {text}
      </Text>
    </View>
  );
};

/** Out of credits: history stays readable, free tips stay available. */
const CreditsNotice = ({ onFreeTips }: { readonly onFreeTips?: () => void }) => (
  <View
    accessibilityRole="alert"
    style={sx("my-space-sm rounded-lg border border-outline-variant bg-surface-container-high p-space-md")}
  >
    <Text style={sx("font-headline-semi text-body-lg text-on-surface")}>You&apos;re out of AI credits</Text>
    <Text style={sx("mt-1 font-body text-body-md text-on-surface-variant")}>
      Credits reset next month. Free tips still work.
    </Text>
    {onFreeTips ? (
      <LimeCta label="Use free tips" onPress={onFreeTips} variant="dark" style={{ height: 44, marginTop: 12 }} />
    ) : null}
  </View>
);

/** Chef chat for one planned meal. Thread, caps and credits live on the server. */
export const ChefChat = () => {
  const messages = useChefStore((s) => s.messages);
  const detail = useChefStore((s) => s.detail);
  const sending = useChefStore((s) => s.sending);
  const error = useChefStore((s) => s.error);
  const outOfCredits = useChefStore((s) => s.outOfCredits);
  const pendingMessage = useChefStore((s) => s.pendingMessage);
  const capped = useChefStore((s) => s.capped);
  const send = useChefStore((s) => s.send);
  const [draft, setDraft] = useState("");
  const scroll = useRef<ScrollViewInstance>(null);

  const handleSend = (text: string) => {
    if (!text.trim() || sending) return;
    setDraft("");
    void send(text);
  };

  const handleFreeTips = () => {
    if (pendingMessage) void send(pendingMessage, { heuristic: true });
  };

  const turnsLeft = detail?.thread?.turnsLeft;
  const costLabel = detail ? `${detail.costs.chat} credit per message` : "";

  return (
    <View style={sx("flex-1")}>
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        style={sx("flex-1")}
        contentContainerStyle={{ paddingVertical: 8 }}
      >
        {messages.length === 0 ? (
          <View>
            <Text style={sx("mb-space-sm font-body text-body-md text-on-surface-variant")}>
              Ask about cooking steps, swaps, portions or storage for this meal.
            </Text>
            <View style={sx("flex-row flex-wrap gap-space-sm")}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => handleSend(s)} />
              ))}
            </View>
          </View>
        ) : (
          messages.map((m) => <Bubble key={m.id} role={m.role} text={m.text} />)
        )}
        {sending ? (
          <View accessibilityLabel="Chef is typing" style={sx("self-start p-space-sm")}>
            <ActivityIndicator color={color.primaryFixed} />
          </View>
        ) : null}
        {outOfCredits ? <CreditsNotice onFreeTips={pendingMessage ? handleFreeTips : undefined} /> : null}
        {error ? (
          <View style={sx("mb-space-sm")}>
            <CapsLabel tone="alert">{error}</CapsLabel>
          </View>
        ) : null}
        {capped ? (
          <View style={sx("mb-space-sm")}>
            <CapsLabel>Chat limit reached. Your recipe is still here.</CapsLabel>
          </View>
        ) : null}
      </ScrollView>

      {capped ? null : (
        <View>
          <View style={sx("flex-row items-center gap-space-sm")}>
            <TextInput
              accessibilityLabel="Message Chef"
              placeholder="Ask Chef about this meal"
              placeholderTextColor={color.onSurfaceVariant}
              value={draft}
              maxLength={MAX_CHARS}
              onChangeText={setDraft}
              onSubmitEditing={() => handleSend(draft)}
              returnKeyType="send"
              editable={!sending}
              style={sx(
                "flex-1 rounded-full bg-surface-container-highest px-space-md py-space-sm font-body text-body-md text-on-surface",
              )}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={sending || !draft.trim()}
              onPress={() => handleSend(draft)}
              style={[
                sx("h-11 w-11 items-center justify-center rounded-full bg-primary-fixed"),
                { opacity: sending || !draft.trim() ? 0.5 : 1 },
              ]}
            >
              <Send size={18} color={color.onPrimaryFixed} />
            </Pressable>
          </View>
          <Text style={sx("mt-1 text-center font-body text-body-sm text-on-surface-variant")}>
            {costLabel}
            {turnsLeft !== undefined ? ` · ${turnsLeft} messages left` : ""}
          </Text>
        </View>
      )}
    </View>
  );
};
