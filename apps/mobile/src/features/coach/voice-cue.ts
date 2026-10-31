import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";

import { getTodayVoiceCue } from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";

import {
  clearCuePlayed,
  getSpeakCuesEnabled,
  hasPlayedCueOn,
  localDateKey,
  markCuePlayed,
} from "./voice-cue-prefs";

let inFlight = false;

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const playAudio = async (audioBase64: string, date: string): Promise<void> => {
  // User opted into Speak cues — play even if the hardware switch is muted.
  await setAudioModeAsync({ playsInSilentMode: true });
  const file = new File(Paths.cache, `voice-cue-${date}.mp3`);
  file.write(base64ToBytes(audioBase64));
  const player = createAudioPlayer({ uri: file.uri });
  const sub = player.addListener("playbackStatusUpdate", (status) => {
    if (!status.didJustFinish) return;
    sub.remove();
    player.remove();
  });
  player.play();
};

/** Free on-device TTS when ElevenLabs audio is absent (no cloud cost). */
const speakOnDevice = async (text: string): Promise<void> => {
  // Speech uses the app audio session; without this iOS mute switch silences it.
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (err) {
    logger.warn("voice_cue.audio_mode_failed", { message: errorMessage(err) });
  }
  await new Promise<void>((resolve) => {
    void Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      rate: 0.95,
      pitch: 1.0,
      useApplicationAudioSession: true,
      onStart: () => logger.info("voice_cue.device_tts.start"),
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
};

type PlayOpts = { readonly force?: boolean };

/**
 * Fetch + play today's spoken coach cue once per local date. Fire-and-forget.
 * Prefers ElevenLabs audioBase64; otherwise uses expo-speech (device TTS, $0).
 * Pass `{ force: true }` to replay (clears the once-per-day guard).
 */
export const playTodayVoiceCueOnce = async (opts: PlayOpts = {}): Promise<void> => {
  if (inFlight) return;
  inFlight = true;
  try {
    if (!(await getSpeakCuesEnabled())) return;
    const date = localDateKey();
    if (opts.force) await clearCuePlayed(date);
    else if (await hasPlayedCueOn(date)) return;
    try {
      const cue = await getTodayVoiceCue(date);
      if (cue.audioBase64) {
        await playAudio(cue.audioBase64, date);
        await markCuePlayed(date);
        logger.info("voice_cue.played", { source: "elevenlabs", remaining: cue.remaining });
        return;
      }
      if (cue.text.trim()) {
        await speakOnDevice(cue.text.trim());
        await markCuePlayed(date);
        logger.info("voice_cue.played", { source: "device_tts", remaining: cue.remaining });
      }
    } catch (err) {
      // 429 = daily cap spent: don't retry today. Network errors retry on next focus.
      if (err instanceof MirraApiError && err.status === 429) await markCuePlayed(date);
      logger.warn("voice_cue.failed", { message: errorMessage(err) });
    }
  } finally {
    inFlight = false;
  }
};
