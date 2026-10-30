import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type AppDB = DrizzleD1Database<typeof schema>;

export const createDb = (d1: D1Database): AppDB => drizzle(d1, { schema });

export { schema };
