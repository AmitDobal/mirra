import type { SQLiteDatabase } from "expo-sqlite";

import { MIGRATION_001 } from "./migrations/sql-001";
import { MIGRATION_002 } from "./migrations/sql-002";
import { MIGRATION_003 } from "./migrations/sql-003";
import { MIGRATION_004 } from "./migrations/sql-004";
import { MIGRATION_005 } from "./migrations/sql-005";
import { MIGRATION_006 } from "./migrations/sql-006";
import { nowMs } from "./ids";

const TARGET = 6;

const statements = (sql: string): string[] =>
  sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

const apply = async (db: SQLiteDatabase, version: number, sql: string) => {
  for (const statement of statements(sql)) {
    await db.execAsync(statement);
  }
  await db.runAsync(
    "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    version,
    nowMs(),
  );
};

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

  if (current < 1) await apply(db, 1, MIGRATION_001);
  if (current < 2) await apply(db, 2, MIGRATION_002);
  if (current < 3) await apply(db, 3, MIGRATION_003);
  if (current < 4) await apply(db, 4, MIGRATION_004);
  if (current < 5) await apply(db, 5, MIGRATION_005);
  if (current < 6) await apply(db, 6, MIGRATION_006);
};
