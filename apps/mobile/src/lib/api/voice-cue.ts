import { apiFetch } from "./client";

/** Mirrors API `GET /v1/voice/cue/today`. `audioBase64` is absent for text-only cues. */
export type VoiceCue = {
  readonly text: string;
  readonly audioBase64?: string;
  readonly contentType: string;
  readonly cached: boolean;
  readonly remaining: number;
};

export const getTodayVoiceCue = (date?: string) =>
  apiFetch<VoiceCue>("/v1/voice/cue/today", { query: { date }, quiet: true });
