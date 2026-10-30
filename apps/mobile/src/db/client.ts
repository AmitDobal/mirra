import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./migrate";

const DATABASE_NAME = "mirra.db";

let opening: Promise<SQLiteDatabase> | null = null;

const openFresh = async (): Promise<SQLiteDatabase> => {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
};

/** Open `mirra.db` and run pending migrations (singleton). */
export const getDb = (): Promise<SQLiteDatabase> => {
  if (!opening) {
    opening = openFresh().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
};

export type { SQLiteDatabase };
