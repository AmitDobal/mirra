import { apiFetch } from "./client";
import type { CheckIn, CreateCheckInBody } from "./types";

export const createCheckIn = (body: CreateCheckInBody) =>
  apiFetch<CheckIn>("/v1/check-ins", { method: "POST", body });

/** Newest-first page of check-ins (default 20); pass `nextCursor` to continue. */
export const listCheckInsApi = (cursor?: string | null, limit = 20) =>
  apiFetch<{ items: CheckIn[]; nextCursor: string | null }>("/v1/check-ins", {
    query: { limit, cursor },
  });
