import { apiFetch } from "./client";
import type { CheckIn, CreateCheckInBody } from "./types";

export const createCheckIn = (body: CreateCheckInBody) =>
  apiFetch<CheckIn>("/v1/check-ins", { method: "POST", body });

export const listCheckIns = (limit = 3) =>
  apiFetch<{ items: CheckIn[] }>("/v1/check-ins", {
    query: { limit },
  });
