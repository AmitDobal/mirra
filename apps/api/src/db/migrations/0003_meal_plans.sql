CREATE TABLE `meal_plan_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`plan_id` text,
	`source` text NOT NULL,
	`targets_json` text NOT NULL,
	`rebalanced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plan_days_user_date_uq` ON `meal_plan_days` (`user_id`, `local_date`);
--> statement-breakpoint
CREATE TABLE `meal_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`slot` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`items_json` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`logged_meal_id` text,
	`fit` text DEFAULT 'ok' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `meal_plan_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meal_plan_items_day_idx` ON `meal_plan_items` (`day_id`);
