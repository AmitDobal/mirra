import type { ZodSchema } from "zod";

import { validationError } from "./errors";

export const parseBody = <T>(schema: ZodSchema<T>, raw: unknown): T => {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    throw validationError(`${path}${first?.message ?? "Invalid body"}`);
  }
  return result.data;
};
