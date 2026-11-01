ALTER TABLE `meals` ADD `fiber_g` integer;
--> statement-breakpoint
ALTER TABLE `meals` ADD `sugar_g` integer;
--> statement-breakpoint
ALTER TABLE `meals` ADD `sodium_mg` integer;
--> statement-breakpoint
ALTER TABLE `meals` ADD `ingredients_json` text;
--> statement-breakpoint
ALTER TABLE `meals` ADD `warnings_json` text;
--> statement-breakpoint
ALTER TABLE `meals` ADD `analysis_status` text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE `meals` ADD `analysis_source` text;
--> statement-breakpoint
ALTER TABLE `meals` ADD `estimate_confidence` real;
--> statement-breakpoint
CREATE TABLE `nutrition_day_rollup` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`kcal_in` integer DEFAULT 0 NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`kcal_target` integer,
	`workout_minutes` integer DEFAULT 0 NOT NULL,
	`sets_completed` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nutrition_day_rollup_user_date_idx` ON `nutrition_day_rollup` (`user_id`, `local_date`);
--> statement-breakpoint
CREATE TABLE `meal_analysis_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`meal_id` text,
	`media_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`input_json` text DEFAULT '{}' NOT NULL,
	`result_json` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meal_analysis_jobs_user_idx` ON `meal_analysis_jobs` (`user_id`);
--> statement-breakpoint
CREATE INDEX `meal_analysis_jobs_status_idx` ON `meal_analysis_jobs` (`status`, `created_at`);
