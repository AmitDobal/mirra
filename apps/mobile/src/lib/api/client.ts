import { env } from "@/lib/config/env";

import type { ApiErrorBody } from "./types";

export class MirraApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "MirraApiError";
    this.code = code;
    this.status = status;
  }
}

export type RequestOptions = {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | undefined | null>;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
};

const buildUrl = (path: string, query?: RequestOptions["query"]): string => {
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

const buildHeaders = (idempotencyKey?: string): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (env.mirraUserId) {
    headers["x-mirra-user-id"] = env.mirraUserId;
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
};

/** Typed JSON fetch against Mirra API (`/v1/...`). */
export const apiFetch = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = "GET", body, query, idempotencyKey, signal } = options;
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: buildHeaders(idempotencyKey),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errBody = data as ApiErrorBody | null;
    throw new MirraApiError(
      errBody?.error?.code ?? "http_error",
      errBody?.error?.message ?? (response.statusText || "Request failed"),
      response.status,
    );
  }

  return data as T;
};
