import { PageQuerySchema, type PageQuery } from "@mirra/contracts";
import { and, eq, lt, or, type AnyColumn, type SQL } from "drizzle-orm";

import { validationError } from "./errors";

export type PageCursor = { readonly ts: number; readonly id: string };

const toBase64Url = (s: string): string =>
  btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (s: string): string => {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
};

/** Opaque cursor: base64url("<epochMs>_<id>"). */
export const encodeCursor = (c: PageCursor): string => toBase64Url(`${c.ts}_${c.id}`);

export const decodeCursor = (raw: string): PageCursor => {
  try {
    const text = fromBase64Url(raw);
    const at = text.indexOf("_");
    const ts = Number(text.slice(0, at));
    const id = text.slice(at + 1);
    if (at < 1 || !Number.isFinite(ts) || !id) throw new Error("bad");
    return { ts, id };
  } catch {
    throw validationError("Invalid cursor");
  }
};

/** `?limit=` (default 20, max 50) + `?cursor=` from a raw query record. */
export const parsePageQuery = (query: Record<string, string | undefined>): PageQuery => {
  const result = PageQuerySchema.safeParse(query);
  if (!result.success) {
    const first = result.error.issues[0];
    throw validationError(`${first?.path.join(".") ?? "query"}: ${first?.message ?? "Invalid"}`);
  }
  return result.data;
};

/** WHERE for "strictly older than cursor" on (tsCol DESC, idCol DESC) ordering. */
export const olderThan = (
  tsCol: AnyColumn,
  idCol: AnyColumn,
  cursor: PageCursor,
): SQL | undefined =>
  or(lt(tsCol, new Date(cursor.ts)), and(eq(tsCol, new Date(cursor.ts)), lt(idCol, cursor.id)));

/**
 * Trim an over-fetched (limit + 1) page and derive `nextCursor`.
 * `tsOf` returns epoch ms for the row's sort column.
 */
export const toPage = <T extends { id: string }>(
  rows: readonly T[],
  limit: number,
  tsOf: (row: T) => number,
): { items: T[]; nextCursor: string | null } => {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = rows.length > limit && last ? encodeCursor({ ts: tsOf(last), id: last.id }) : null;
  return { items, nextCursor };
};
