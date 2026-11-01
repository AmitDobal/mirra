import { authClient } from "@/lib/auth/auth-client";
import { getAuthMode, getAuthUserId, getBearerToken } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";

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
  /** Raw bytes (media upload). Overrides `body`; set `Content-Type` via `headers`. */
  readonly rawBody?: Blob;
  readonly query?: Record<string, string | number | boolean | undefined | null>;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
  /** Extra request headers (e.g. `x-mirra-ai-mode: heuristic`). */
  readonly headers?: Record<string, string>;
  /** Best-effort calls (voice cue): log warn, never toast-level error. */
  readonly quiet?: boolean;
};

export const buildUrl = (path: string, query?: RequestOptions["query"]): string => {
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

export const buildHeaders = async (
  idempotencyKey?: string,
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  // Prefer Bearer (Google / minted session); fall back to Expo cookie bridge.
  const bearer = getBearerToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else {
    try {
      const cookie = await Promise.resolve(authClient.getCookie());
      if (cookie) headers.Cookie = cookie;
    } catch {
      /* no session cookie yet */
    }
  }
  // Dev tester / day-test header — only when not on a Google (Bearer) session.
  if (getAuthMode() !== "google" && !bearer) {
    headers["x-mirra-user-id"] = getAuthUserId();
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
};

/** Host only — never log full URLs or headers. */
const apiHost = (): string => {
  try {
    return new URL(env.apiBaseUrl).host;
  } catch {
    return "invalid-base-url";
  }
};

const parseBody = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

/** Typed JSON fetch against Mirra API (`/v1/...`). */
export const apiFetch = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = "GET", body, rawBody, query, idempotencyKey, signal, quiet, headers } = options;
  const startedAt = Date.now();
  const logBase = { method, path, host: apiHost() };
  const logFail = quiet ? logger.warn.bind(logger) : logger.error.bind(logger);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: { ...(await buildHeaders(idempotencyKey)), ...headers },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
      // Expo attaches Cookie manually — omit browser credential merge.
      credentials: "omit",
      signal,
    });
  } catch (err) {
    logFail(quiet ? "api.network.quiet" : "api.network", {
      ...logBase,
      ms: Date.now() - startedAt,
      message: errorMessage(err),
    });
    throw err;
  }

  const text = await response.text();
  const data = parseBody(text);
  const ms = Date.now() - startedAt;

  if (!response.ok) {
    const errBody = data as ApiErrorBody | null;
    const code = errBody?.error?.code ?? "http_error";
    const message =
      errBody?.error?.message ?? (response.statusText || "Request failed");
    logFail(quiet ? "api.error.quiet" : "api.error", {
      ...logBase,
      status: response.status,
      ms,
      code,
      message,
    });
    throw new MirraApiError(code, message, response.status);
  }

  logger.info("api.ok", { ...logBase, status: response.status, ms });
  return data as T;
};
