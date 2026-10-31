import { apiFetch } from "./client";
import type {
  CompleteSessionBody,
  LogSetBody,
  SetLog,
  StartWorkoutSessionBody,
  WorkoutSession,
} from "./types";

const sessionPath = (sessionId: string): string =>
  `/v1/workouts/sessions/${encodeURIComponent(sessionId)}`;

export const startSession = (body: StartWorkoutSessionBody) =>
  apiFetch<WorkoutSession>("/v1/workouts/sessions", {
    method: "POST",
    body,
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
  apiFetch<WorkoutSession>(`${sessionPath(sessionId)}/complete`, {
    method: "POST",
    body,
  });
