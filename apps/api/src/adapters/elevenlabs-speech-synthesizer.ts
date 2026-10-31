import { eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { voiceCueCache } from "../db/schema";
import type { MirraEnv } from "../env";
import type { SpeechSynthesizer, SynthesizeResult } from "../ports/speech-synthesizer";

const DEFAULT_MODEL = "eleven_multilingual_v2";
/** Premade ElevenLabs voice ("Rachel"); override with ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
/** Small mp3 (22.05 kHz / 32 kbps): ~4 KB/s, plenty for a short spoken cue. */
const OUTPUT_FORMAT = "mp3_22050_32";
const CONTENT_TYPE = "audio/mpeg";

/** cache key = sha256(voiceId|text) hex. */
export const voiceCacheKey = async (voiceId: string, text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${voiceId}|${text}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const r2KeyFor = (cacheKey: string): string => `voice-cues/${cacheKey}.mp3`;

const readCached = async (
  env: MirraEnv,
  db: AppDB | undefined,
  cacheKey: string,
): Promise<Uint8Array | null> => {
  if (!db || !env.MEDIA) return null;
  const [row] = await db.select().from(voiceCueCache).where(eq(voiceCueCache.cacheKey, cacheKey)).limit(1);
  if (!row) return null;
  const obj = await env.MEDIA.get(row.r2Key);
  return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
};

const writeCached = async (
  env: MirraEnv,
  db: AppDB | undefined,
  entry: { cacheKey: string; text: string; voiceId: string; audio: Uint8Array },
): Promise<void> => {
  if (!db || !env.MEDIA) return; // No R2: bytes are returned once, never stored.
  const r2Key = r2KeyFor(entry.cacheKey);
  await env.MEDIA.put(r2Key, entry.audio, { httpMetadata: { contentType: CONTENT_TYPE } });
  await db
    .insert(voiceCueCache)
    .values({
      cacheKey: entry.cacheKey,
      r2Key,
      text: entry.text,
      voiceId: entry.voiceId,
      bytes: entry.audio.byteLength,
      createdAt: new Date(),
    })
    .onConflictDoNothing();
};

/** ElevenLabs TTS with D1 + R2 cache. Vendor errors degrade to text-only (never throw). */
export const createElevenLabsSpeechSynthesizer = (env: MirraEnv, db?: AppDB): SpeechSynthesizer => ({
  synthesize: async ({ text, voiceId }): Promise<SynthesizeResult> => {
    const apiKey = env.ELEVENLABS_API_KEY?.trim();
    const voice = voiceId?.trim() || env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
    const model = env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL;
    const base = { contentType: CONTENT_TYPE, provider: "elevenlabs", model } as const;
    const textOnly: SynthesizeResult = { ...base, audioBytes: null, cached: false, characters: 0 };
    if (!apiKey) return textOnly;

    try {
      const cacheKey = await voiceCacheKey(voice, text);
      const hit = await readCached(env, db, cacheKey);
      if (hit) return { ...base, audioBytes: hit, cached: true, characters: 0 };

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${OUTPUT_FORMAT}`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: CONTENT_TYPE },
          body: JSON.stringify({ text, model_id: model }),
        },
      );
      if (!res.ok) {
        console.warn("[elevenlabs] tts failed", res.status);
        return textOnly;
      }
      const audio = new Uint8Array(await res.arrayBuffer());
      await writeCached(env, db, { cacheKey, text, voiceId: voice, audio }).catch((err) =>
        console.warn("[elevenlabs] cache write failed", err instanceof Error ? err.message : String(err)),
      );
      return { ...base, audioBytes: audio, cached: false, characters: text.length };
    } catch (err) {
      console.warn("[elevenlabs] error → text-only", err instanceof Error ? err.message : String(err));
      return textOnly;
    }
  },
});
