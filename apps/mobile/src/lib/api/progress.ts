import { File, Paths } from "expo-file-system";

import { apiFetch } from "./client";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthMode, getAuthUserId, getBearerToken } from "@/lib/auth/session";
import { env } from "@/lib/config/env";

export type ProgressPhotoDto = {
  readonly id: string;
  readonly pose: "front" | "side";
  readonly takenAt: number;
  readonly note: string | null;
  readonly mediaId: string;
  readonly mediaPath: string | null;
  readonly hasMedia: boolean;
};

export type CreateProgressPhotoBody = {
  readonly pose?: "front" | "side";
  readonly note?: string | null;
  readonly takenAt?: number;
  readonly imageBase64?: string;
  readonly contentType?: "image/jpeg" | "image/png" | "image/webp";
};

export const PROGRESS_PAGE_SIZE = 10;

/** Newest-first page; pass the previous `nextCursor` to continue. */
export const listProgressPhotosApi = (cursor?: string | null, limit = PROGRESS_PAGE_SIZE) =>
  apiFetch<{ items: ProgressPhotoDto[]; nextCursor: string | null }>("/v1/progress/photos", {
    query: { limit, cursor },
  });

export const createProgressPhotoApi = (body: CreateProgressPhotoBody) =>
  apiFetch<ProgressPhotoDto>("/v1/progress/photos", {
    method: "POST",
    body,
  });

export const getProgressPhotoApi = (id: string) =>
  apiFetch<ProgressPhotoDto>(`/v1/progress/photos/${id}`);

export const mediaAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { Accept: "image/*" };
  const bearer = getBearerToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else {
    try {
      const cookie = await Promise.resolve(authClient.getCookie());
      if (cookie) headers.Cookie = cookie;
    } catch {
      /* none */
    }
  }
  if (getAuthMode() !== "google" && !bearer) {
    headers["x-mirra-user-id"] = getAuthUserId();
  }
  return headers;
};

/** Download authenticated media bytes into cache; returns local file URI or null. */
export const cacheProgressPhotoMedia = async (
  photoId: string,
  mediaPath: string | null,
): Promise<string | null> => {
  if (!mediaPath) return null;
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const path = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
  const headers = await mediaAuthHeaders();
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) return null;
  const file = new File(Paths.cache, `progress-${photoId}.jpg`);
  file.write(buf);
  return file.uri;
};
