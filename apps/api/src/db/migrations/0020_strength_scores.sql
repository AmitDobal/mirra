CREATE TABLE `exercise_scores` (
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sustained_pct` real NOT NULL,
	`best_pct` real NOT NULL,
	`last_session_pct` real NOT NULL,
	`best_e1rm_kg` real,
	`best_weight_kg` real,
	`best_reps` integer,
	`sessions` integer NOT NULL,
	`display_step` integer NOT NULL,
	`below_count` integer DEFAULT 0 NOT NULL,
	`standards_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `exercise_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `muscle_scores` (
	`user_id` text NOT NULL,
	`muscle_id` text NOT NULL,
	`pct` real NOT NULL,
	`display_step` integer NOT NULL,
	`contributors_json` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `muscle_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `strength_summary` (
	`user_id` text PRIMARY KEY NOT NULL,
	`overall_pct` real,
	`overall_step` integer,
	`groups_json` text DEFAULT '[]' NOT NULL,
	`ranked_exercises` integer DEFAULT 0 NOT NULL,
	`groups_covered` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `strength_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`scope` text NOT NULL,
	`ref_id` text NOT NULL,
	`from_step` integer,
	`to_step` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `strength_events_user_session_idx` ON `strength_events` (`user_id`,`session_id`);
