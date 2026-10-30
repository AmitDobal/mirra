import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "rate_limited"
  | "internal";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: ContentfulStatusCode;

  constructor(code: ApiErrorCode, message: string, status: ContentfulStatusCode) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export const unauthorized = (message = "Authentication required") =>
  new ApiError("unauthorized", message, 401);

export const notFound = (message = "Not found") =>
  new ApiError("not_found", message, 404);

export const conflict = (message: string) =>
  new ApiError("conflict", message, 409);

export const validationError = (message: string) =>
  new ApiError("validation_error", message, 400);

export const badRequest = (message: string) =>
  new ApiError("validation_error", message, 400);
