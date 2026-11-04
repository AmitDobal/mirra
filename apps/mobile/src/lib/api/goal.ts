import type { GoalResponse } from "@mirra/contracts";

import { errorMessage, logger } from "@/lib/logger";

import { apiFetch, buildHeaders, buildUrl, MirraApiError } from "./client";
import type { ApiErrorBody } from "./types";

export type { GoalMilestoneDto, GoalResponse, GoalTimelineStatus } from "@mirra/contracts";

/** `GET /v1/goal` outcome: a fresh body (+ its ETag) or "your cached copy is current". */
export type GoalFetchResult =
  | { readonly kind: "ok"; readonly body: GoalResponse; readonly etag: string | null }
  | { readonly kind: "not_modified" };

const parse = (text: string): unknown => {
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
};

/**
 * `GET /v1/goal` (AMI-179) with `If-None-Match`. A 304 is a normal outcome here, so this
 * does not go through `apiFetch` (which treats every non-2xx as an error).
 */
export const getGoal = async (etag?: string | null): Promise<GoalFetchResult> => {
  const headers = await buildHeaders();
  if (etag) headers["If-None-Match"] = etag;
  let res: Response;
  try {
    res = await fetch(buildUrl("/v1/goal"), { method: "GET", headers, credentials: "omit" });
  } catch (err) {
    logger.warn("api.network.quiet", { method: "GET", path: "/v1/goal", message: errorMessage(err) });
    throw err;
  }
  if (res.status === 304) return { kind: "not_modified" };
  const data = parse(await res.text());
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new MirraApiError(err?.code ?? "http_error", err?.message ?? "Request failed", res.status);
  }
  logger.info("api.ok", { method: "GET", path: "/v1/goal", status: res.status });
  return { kind: "ok", body: data as GoalResponse, etag: res.headers.get("etag") };
};

/** `POST /v1/goal/restart`: new plan version from today's trend. 429 after one restart a day (S44 explains it). */
export const restartGoal = () => apiFetch<GoalResponse>("/v1/goal/restart", { method: "POST", quiet: true });
