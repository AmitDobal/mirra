import type { SpeechSynthesizer } from "../ports/speech-synthesizer";

/** No-key fallback: text-only response, zero cost. Mobile skips playback. */
export const stubSpeechSynthesizer: SpeechSynthesizer = {
  synthesize: async () => ({
    audioBytes: null,
    contentType: "audio/mpeg",
    cached: false,
    provider: "stub",
    characters: 0,
  }),
};
