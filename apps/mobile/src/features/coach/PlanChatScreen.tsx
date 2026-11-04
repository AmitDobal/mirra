import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { planChatCopy } from "@/content/plan-chat";
import { sx } from "@/theme/sx";
import { color, font } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { Chip } from "@/ui/Chip";
import { KEYBOARD_BEHAVIOR } from "@/ui/keyboard";

import { ChatComposer } from "./chat/ChatComposer";
import { CoachBubble, CoachTyping, UserBubble } from "./chat/ChatBubbles";
import { ProposalCard } from "./proposal/ProposalCard";
import { hairline } from "./proposal/proposal-styles";
import { usePlanChatStore, type PlanChatMessage } from "./plan-chat-store";

const QUICK_PROMPTS = [
  "No cable machines",
  "Only dumbbells",
  "Prefer bench press",
  "No dairy",
  "Vegetarian dinner",
  "Shorter session",
] as const;

const NEAR_LIMIT_LEFT = 2;

/** Soft hint only near/at the AI limit. Quick prompts always still work (rules-based, free). */
const reviseQuotaNote = (usage: { used: number; limit: number } | null): string | null => {
  if (!usage || usage.limit <= 0) return null;
  const left = Math.max(0, usage.limit - usage.used);
  if (left > NEAR_LIMIT_LEFT) return null;
  return left === 0
    ? "AI replies are used up for today. The quick prompts below still work."
    : `${left} AI ${left === 1 ? "reply" : "replies"} left today. Quick prompts below are unlimited.`;
};

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/coach");
};

/** Plan chat (Stitch S39) — edit meal + workout plans in conversation. Changes apply only after "Yes, apply". */
export const PlanChatScreen = () => {
  const insets = useSafeAreaInsets();
  const messages = usePlanChatStore((s) => s.messages);
  const loading = usePlanChatStore((s) => s.loading);
  const error = usePlanChatStore((s) => s.error);
  const send = usePlanChatStore((s) => s.send);
  const pendingId = usePlanChatStore((s) => s.pendingId);
  const applying = usePlanChatStore((s) => s.applying);
  const confirm = usePlanChatStore((s) => s.confirm);
  const dismiss = usePlanChatStore((s) => s.dismiss);
  const reviseUsage = usePlanChatStore((s) => s.reviseUsage);
  const loadUsage = usePlanChatStore((s) => s.loadUsage);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, loading, applying]);

  const locked = pendingId !== null;
  const canSend = draft.trim().length > 0 && !loading && !locked;
  const quotaNote = reviseQuotaNote(reviseUsage);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || loading || locked) return;
    setDraft("");
    void send(value);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={KEYBOARD_BEHAVIOR}>
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={handleBack} style={styles.back}>
          <ArrowLeft size={20} color={color.onSurface} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {planChatCopy.title}
        </Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            applying={applying}
            onApply={() => void confirm(m.id)}
            onChange={() => dismiss(m.id)}
          />
        ))}
        {loading ? <CoachTyping /> : null}
        {error ? <CapsLabel tone="alert">{error}</CapsLabel> : null}
        {quotaNote ? <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{quotaNote}</Text> : null}
      </ScrollView>

      {locked ? null : (
        <View style={sx("flex-row flex-wrap gap-space-sm px-space-md py-space-xs")}>
          {QUICK_PROMPTS.map((label) => (
            <Chip key={label} label={label} onPress={() => submit(label)} />
          ))}
        </View>
      )}

      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSend={() => submit(draft)}
        locked={locked}
        canSend={canSend}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
};

type MessageProps = {
  readonly message: PlanChatMessage;
  readonly applying: boolean;
  readonly onApply: () => void;
  readonly onChange: () => void;
};

/** One thread entry: user bubble, or coach bubble (+ notes) followed by the full-width S39 card. */
const Message = ({ message, applying, onApply, onChange }: MessageProps) => {
  if (message.role === "user") return <UserBubble text={message.text} />;
  return (
    <>
      <CoachBubble text={message.text} warnings={message.warnings} />
      {message.proposal ? (
        <ProposalCard proposal={message.proposal} applying={applying} onApply={onApply} onChange={onChange} />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1 },
  topBar: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: hairline,
  },
  backSpacer: { width: 40 },
  title: { fontFamily: font.headlineSemi, fontSize: 18, lineHeight: 24, color: color.onSurface },
  thread: { gap: 16, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
});
