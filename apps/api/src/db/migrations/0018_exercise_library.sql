CREATE TABLE `exercise_tags` (
	`normalized_name` text PRIMARY KEY NOT NULL,
	`canonical_id` text NOT NULL,
	`muscles_json` text NOT NULL,
	`scoring` text NOT NULL,
	`pattern` text NOT NULL,
	`source` text NOT NULL,
	`model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `canonical_id` text;
--> statement-breakpoint
ALTER TABLE `set_logs` ADD `canonical_id` text;
--> statement-breakpoint
CREATE INDEX `set_logs_canonical_idx` ON `set_logs` (`canonical_id`);
