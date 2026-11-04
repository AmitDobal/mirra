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
