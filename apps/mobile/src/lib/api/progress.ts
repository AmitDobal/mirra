import { apiFetch } from "./client";

export type ProgressPhotoDto = {
  readonly id: string;
  readonly pose: "front" | "side";
  readonly takenAt: number;
  readonly note: string | null;
  readonly mediaId: string;
  readonly uri: string | null;
};

export type CreateProgressPhotoBody = {
  readonly pose?: "front" | "side";
  readonly note?: string | null;
  readonly takenAt?: number;
  readonly localUri?: string;
};

export const PROGRESS_PAGE_SIZE = 20;

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
