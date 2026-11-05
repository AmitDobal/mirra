import { apiFetch } from "./client";
import type { ApiTierChange } from "./strength-exercise";
import type {
  CompleteSessionBody,
  LogSetBody,
  SetLog,
  StartWorkoutSessionBody,
  WorkoutSession,
} from "./types";

/** Complete response: session + tier promotions (max 6, overall > group > muscle > exercise). */
export type CompletedSession = WorkoutSession & {
  readonly tierChanges?: readonly ApiTierChange[];
};

const sessionPath = (sessionId: string): string =>
  `/v1/workouts/sessions/${encodeURIComponent(sessionId)}`;

export const startSession = (body: StartWorkoutSessionBody, signal?: AbortSignal) =>
  apiFetch<WorkoutSession>("/v1/workouts/sessions", {
    method: "POST",
    body,
    signal,
  });

export const logSet = (sessionId: string, body: LogSetBody) =>
  apiFetch<SetLog>(`${sessionPath(sessionId)}/sets`, {
    method: "POST",
    body,
  });

export const completeSession = (
  sessionId: string,
  body: CompleteSessionBody = {},
) =>
  apiFetch<CompletedSession>(`${sessionPath(sessionId)}/complete`, {
    method: "POST",
    body,
  });

/** RPE / notes after the HUD already completed the session (AMI-172). */
export const patchSession = (sessionId: string, body: CompleteSessionBody) =>
  apiFetch<WorkoutSession>(sessionPath(sessionId), {
    method: "PATCH",
    body,
  });
