/**
 * In-memory D1 stand-in for offline assertions: every D1 migration applied to node:sqlite,
 * wrapped in drizzle sqlite-proxy (batch = one transaction). Same harness as
 * assert-revise-drafts / assert-workout-revise.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { drizzle } from "drizzle-orm/sqlite-proxy";

import type { AppDB } from "../../src/db";
import * as schema from "../../src/db/schema";

export const createMemoryDb = (): { db: AppDB; sqlite: DatabaseSync } => {
  const sqlite = new DatabaseSync(":memory:");
  const migrations = join(import.meta.dirname, "../../src/db/migrations");
  for (const f of readdirSync(migrations).filter((x) => x.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(migrations, f), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  const exec = (sql: string, params: unknown[], method: string) => {
    const stmt = sqlite.prepare(sql);
    const args = params as SQLInputValue[];
    if (method === "run") {
      stmt.run(...args);
      return { rows: [] as unknown[] };
    }
    stmt.setReturnArrays(true);
    if (method === "get") return { rows: (stmt.get(...args) as unknown[] | undefined) ?? [] };
    return { rows: stmt.all(...args) as unknown[] };
  };
  const db = drizzle(
    async (sql, params, method) => exec(sql, params, method) as { rows: never[] },
    async (queries) => {
      sqlite.exec("BEGIN");
      try {
        const out = queries.map((q) => exec(q.sql, q.params, q.method));
        sqlite.exec("COMMIT");
        return out as { rows: never[] }[];
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    { schema },
  ) as unknown as AppDB;
  return { db, sqlite };
};

/** Fresh node:sqlite DB with every D1 migration applied. */
export const migratedSqlite = (): DatabaseSync => {
  const sqlite = new DatabaseSync(":memory:");
  const migrations = join(import.meta.dirname, "../../src/db/migrations");
  for (const f of readdirSync(migrations).filter((x) => x.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(migrations, f), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  return sqlite;
};

/**
 * Minimal `D1Database` over node:sqlite (prepare/bind/all/first/run/raw/batch) so `createApp()`
 * routes run offline with `env.DB`. Same calls drizzle-orm/d1 makes.
 */
export const createMemoryD1 = (sqlite: DatabaseSync = migratedSqlite()): { d1: D1Database; sqlite: DatabaseSync } => {
  const toArgs = (params: unknown[]) =>
    params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p === undefined ? null : p)) as SQLInputValue[];
  const meta = (changes = 0) => ({ changes, duration: 0, last_row_id: 0, changed_db: changes > 0, size_after: 0, rows_read: 0, rows_written: changes });
  type Stmt = { bind: (...args: unknown[]) => Stmt; execSync: () => unknown[] } & Record<string, unknown>;
  const make = (sql: string, params: unknown[] = []): Stmt => ({
    bind: (...args: unknown[]): Stmt => make(sql, args),
    all: async () => ({ results: sqlite.prepare(sql).all(...toArgs(params)), success: true, meta: meta() }),
    first: async (col?: string) => {
      const row = sqlite.prepare(sql).get(...toArgs(params)) as Record<string, unknown> | undefined;
      if (!row) return null;
      return col ? (row[col] ?? null) : row;
    },
    run: async () => {
      const r = sqlite.prepare(sql).run(...toArgs(params));
      return { results: [], success: true, meta: meta(Number(r.changes)) };
    },
    raw: async () => {
      const s = sqlite.prepare(sql);
      s.setReturnArrays(true);
      return s.all(...toArgs(params));
    },
    execSync: () => sqlite.prepare(sql).all(...toArgs(params)),
  });
  const d1 = {
    prepare: (sql: string) => make(sql),
    batch: async (stmts: Stmt[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ results: s.execSync(), success: true, meta: meta() }));
        sqlite.exec("COMMIT");
        return out;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    exec: async (sql: string) => {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  };
  return { d1: d1 as unknown as D1Database, sqlite };
};
