import { createElevenLabsSpeechSynthesizer } from "../adapters/elevenlabs-speech-synthesizer";
import { stubSpeechSynthesizer } from "../adapters/stub-speech-synthesizer";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { SpeechSynthesizer } from "../ports/speech-synthesizer";

/**
 * TTS factory. `VOICE_PROVIDER=stub` forces text-only; `elevenlabs` (or unset) uses
 * ElevenLabs when `ELEVENLABS_API_KEY` exists, else the stub.
 */
export const getSpeechSynthesizer = (env: MirraEnv, db?: AppDB): SpeechSynthesizer => {
  const choice = env.VOICE_PROVIDER?.trim().toLowerCase();
  if (choice === "stub") return stubSpeechSynthesizer;
  if (env.ELEVENLABS_API_KEY?.trim()) return createElevenLabsSpeechSynthesizer(env, db);
  return stubSpeechSynthesizer;
};
