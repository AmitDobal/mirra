import { router } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { Chip } from "@/ui/Chip";

import { usePlanChatStore, type PlanChatMessage } from "./plan-chat-store";

const QUICK_PROMPTS = [
  "No cable machines",
  "Only dumbbells",
  "Prefer bench press",
  "No dairy",
  "Vegetarian dinner",
  "Shorter session",
] as const;

const MAX_LEN = 2000;

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

/** Plan chat — edit meal + workout plans in conversation. Changes apply automatically. */
export const PlanChatScreen = () => {
  const insets = useSafeAreaInsets();
  const messages = usePlanChatStore((s) => s.messages);
  const loading = usePlanChatStore((s) => s.loading);
  const error = usePlanChatStore((s) => s.error);
  const send = usePlanChatStore((s) => s.send);
  const reviseUsage = usePlanChatStore((s) => s.reviseUsage);
  const loadUsage = usePlanChatStore((s) => s.loadUsage);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, loading]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || loading) return;
    setDraft("");
    void send(value);
  };

  const canSend = draft.trim().length > 0 && !loading;
  const quotaNote = reviseQuotaNote(reviseUsage);

  return (
    <KeyboardAvoidingView
      style={sx("flex-1 bg-surface")}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          sx("flex-row items-center gap-space-sm px-space-md pb-space-sm"),
          { paddingTop: insets.top + 12 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <ArrowLeft size={20} color={color.onSurface} />
        </Pressable>
        <View style={sx("flex-1")}>
          <View style={sx("flex-row items-center gap-space-sm")}>
            <CapsLabel tone="lime">Mirra coach</CapsLabel>
            <AiBadge />
          </View>
          <Text style={sx("font-headline text-headline-md text-on-surface")}>Adjust your plan</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={sx("flex-1")}
        contentContainerStyle={sx("gap-space-sm px-space-md pb-space-md pt-space-sm")}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {loading ? (
          <View style={sx("flex-row items-center gap-2 self-start rounded-lg bg-surface-container-high px-space-md py-space-sm")}>
            <ActivityIndicator color={color.primaryFixed} />
            <Text style={sx("font-body text-body-sm text-on-surface-variant")}>Updating your plan…</Text>
          </View>
        ) : null}
        {error ? <CapsLabel tone="alert">{error}</CapsLabel> : null}
        {quotaNote ? (
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{quotaNote}</Text>
        ) : null}
      </ScrollView>

      <View style={sx("flex-row flex-wrap gap-space-sm px-space-md py-space-xs")}>
        {QUICK_PROMPTS.map((label) => (
          <Chip key={label} label={label} onPress={() => submit(label)} />
        ))}
      </View>

      <View
        style={[
          sx("flex-row items-center gap-space-sm px-space-md pt-space-sm"),
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        <TextInput
          accessibilityLabel="Message your coach"
          placeholder="e.g. no cable machines, prefer bench press"
          placeholderTextColor={color.onSurfaceVariant}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => submit(draft)}
          maxLength={MAX_LEN}
          returnKeyType="send"
          style={sx(
            "min-h-[48px] flex-1 rounded-full bg-surface-container-highest px-space-md py-space-sm font-body text-body-md text-on-surface",
          )}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => submit(draft)}
          style={sx(`h-12 w-12 items-center justify-center rounded-full ${
            canSend ? "bg-primary-fixed" : "bg-surface-container-high"
          }`)}
        >
          <Send size={20} color={canSend ? color.onPrimaryFixed : color.onSurfaceVariant} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const Bubble = ({ message }: { message: PlanChatMessage }) => {
  const mine = message.role === "user";
  return (
    <View style={[sx(mine ? "self-end" : "self-start"), { maxWidth: "88%" }]}>
      {!mine ? (
        <View style={sx("mb-1")}>
          <AiBadge tone="lime" size={16} />
        </View>
      ) : null}
      <View
        style={sx(`rounded-lg px-space-md py-space-sm ${
          mine ? "bg-primary-fixed" : "bg-surface-container-high"
        }`)}
      >
        <Text
          style={sx(`font-body-medium text-body-md ${
            mine ? "text-on-primary-fixed" : "text-on-surface"
          }`)}
        >
          {message.text}
        </Text>
      </View>
      {message.changes && message.changes.length > 0 ? (
        <View style={sx("mt-space-xs flex-row flex-wrap gap-space-xs")}>
          {message.changes.map((c, i) => (
            <View
              key={`${c.kind}-${i}`}
              style={sx("rounded-full border border-primary-fixed/40 bg-primary-fixed/15 px-space-sm py-1")}
            >
              <CapsLabel tone="lime">{c.summary}</CapsLabel>
            </View>
          ))}
        </View>
      ) : null}
      {message.warnings?.map((w) => (
        <Text key={w} style={sx("mt-space-xs font-body text-body-sm text-on-surface-variant")}>
          {w}
        </Text>
      ))}
    </View>
  );
};
