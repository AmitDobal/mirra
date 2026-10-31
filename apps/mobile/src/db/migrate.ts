import type { SQLiteDatabase } from "expo-sqlite";

import { MIGRATION_001 } from "./migrations/sql-001";
import { MIGRATION_002 } from "./migrations/sql-002";
import { MIGRATION_003 } from "./migrations/sql-003";
import { MIGRATION_004 } from "./migrations/sql-004";
import { nowMs } from "./ids";

const TARGET = 4;

const statements = (sql: string): string[] =>
  sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

export const migrate = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  const current = row?.version ?? 0;
  if (current >= TARGET) return;

  if (current < 1) {
    for (const statement of statements(MIGRATION_001)) {
      await db.execAsync(statement);
    }
    await db.runAsync(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      1,
      nowMs(),
    );
  }

  if (current < 2) {
    for (const statement of statements(MIGRATION_002)) {
      await db.execAsync(statement);
    }
    await db.runAsync(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      2,
      nowMs(),
    );
  }

  if (current < 3) {
    for (const statement of statements(MIGRATION_003)) {
      await db.execAsync(statement);
    }
    await db.runAsync(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      3,
      nowMs(),
    );
  }

  if (current < 4) {
    for (const statement of statements(MIGRATION_004)) {
      await db.execAsync(statement);
    }
    await db.runAsync(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      4,
      nowMs(),
    );
  }
};
