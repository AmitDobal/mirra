import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "rate_limited"
  | "ai_credits_exhausted"
  | "ai_spend_cap"
  | "ai_action_cap"
  | "thread_capped"
  | "constraint_violation"
  | "unsafe_output"
  | "internal";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: ContentfulStatusCode;
  /** Extra machine-readable fields merged into `error` (e.g. `resetsAt`). */
  readonly details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: ContentfulStatusCode,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const unauthorized = (message = "Authentication required") =>
  new ApiError("unauthorized", message, 401);

export const forbidden = (message = "Forbidden") =>
  new ApiError("forbidden", message, 403);

export const notFound = (message = "Not found") =>
  new ApiError("not_found", message, 404);

export const conflict = (message: string) =>
  new ApiError("conflict", message, 409);

export const validationError = (message: string) =>
  new ApiError("validation_error", message, 400);

export const badRequest = (message: string) =>
  new ApiError("validation_error", message, 400);
