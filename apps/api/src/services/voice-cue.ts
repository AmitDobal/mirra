import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { estimateMicros } from "../lib/ai-pricing";
import { todayUtc } from "../lib/dates";
import { getSpeechSynthesizer } from "../lib/speech";
import { assertCanSpend, recordUsage } from "./ai-budget";
import { buildTodayActions } from "./today-actions";
import { loadTodayActionsInput } from "./today-actions-inputs";
import { loadTrainerPersona } from "./trainer-persona";
import { buildVoiceCueText } from "./voice-cue-text";

export type VoiceCueCtx = { env: MirraEnv; db: AppDB; userId: string };

export type VoiceCue = {
  text: string;
  audioBase64?: string;
  contentType: string;
  cached: boolean;
  /** Voice cues left today after this one. */
  remaining: number;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const cloudTtsEnabled = (env: MirraEnv): boolean =>
  Boolean(env.ELEVENLABS_API_KEY?.trim()) && env.VOICE_PROVIDER?.trim().toLowerCase() !== "stub";

/**
 * Today's spoken coach cue. Text from today actions (no LLM).
 * Cloud TTS (ElevenLabs) is metered; text-only (device TTS on mobile) is free and uncapped.
 */
export const getTodayVoiceCue = async (ctx: VoiceCueCtx, date = todayUtc()): Promise<VoiceCue> => {
  const paid = cloudTtsEnabled(ctx.env);
  const summary = paid ? await assertCanSpend(ctx.db, ctx.userId, "voice_tts") : null;

  const input = await loadTodayActionsInput(ctx.db, ctx.userId, date);
  const persona = await loadTrainerPersona(ctx.db, ctx.userId);
  const text = sanitizeAiCopy(
    buildVoiceCueText(buildTodayActions(input), input.facts.hourLocal, persona),
  );

  const result = await getSpeechSynthesizer(ctx.env, ctx.db).synthesize({ text, userId: ctx.userId });
  const hasAudio = result.audioBytes != null && result.audioBytes.length > 0;

  // Only burn voice_tts when we actually return paid audio (incl. cache hits).
  if (hasAudio) {
    await recordUsage(ctx.db, {
      userId: ctx.userId,
      feature: "voice_tts",
      provider: result.provider,
      model: result.model ?? null,
      estimatedMicros: estimateMicros(result.provider, result.model, {
        characters: result.characters,
      }),
      meta: { cached: result.cached, chars: text.length, hasAudio: true },
    }).catch((err) => console.warn("[voice-cue] usage record failed", err));
  }

  const remaining = summary
    ? Math.max(0, summary.features.voice.limit - summary.features.voice.used - (hasAudio ? 1 : 0))
    : 99;

  return {
    text,
    ...(hasAudio && result.audioBytes ? { audioBase64: toBase64(result.audioBytes) } : {}),
    contentType: result.contentType,
    cached: result.cached,
    remaining,
  };
};
