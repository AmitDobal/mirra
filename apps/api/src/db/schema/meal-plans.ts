import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

export const mealPlanDays = sqliteTable(
  "meal_plan_days",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    planId: text("plan_id"),
    source: text("source").notNull(),
    targetsJson: text("targets_json").notNull(),
    rebalancedAt: integer("rebalanced_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [uniqueIndex("meal_plan_days_user_date_uq").on(t.userId, t.localDate)],
);

export const mealPlanItems = sqliteTable(
  "meal_plan_items",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => mealPlanDays.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    /** PlannedItem[] */
    itemsJson: text("items_json").notNull(),
    kcal: integer("kcal").notNull(),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    status: text("status").notNull().default("planned"),
    loggedMealId: text("logged_meal_id"),
    fit: text("fit").notNull().default("ok"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("meal_plan_items_day_idx").on(t.dayId)],
);
