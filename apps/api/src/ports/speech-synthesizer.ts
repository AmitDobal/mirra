/** Text-to-speech port. Adapters own the vendor call, caching and R2 storage. */

export type SynthesizeRequest = {
  text: string;
  /** Provider voice id; adapter default when omitted. */
  voiceId?: string;
  userId: string;
};

export type SynthesizeResult = {
  /** `null` = text-only (stub, vendor error, or no key). Clients must skip playback. */
  audioBytes: Uint8Array | null;
  contentType: string;
  /** True when served from cache (no vendor spend). */
  cached: boolean;
  provider: string;
  model?: string;
  /** Characters billed by the vendor for this call (0 on cache hit / failure). */
  characters: number;
};

export type SpeechSynthesizer = {
  synthesize: (req: SynthesizeRequest) => Promise<SynthesizeResult>;
};
