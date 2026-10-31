CREATE TABLE `attendance_day` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`opened_app` integer DEFAULT false NOT NULL,
	`workout_done` integer DEFAULT false NOT NULL,
	`meal_logged` integer DEFAULT false NOT NULL,
	`checked_in` integer DEFAULT false NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attendance_day_user_date_idx` ON `attendance_day` (`user_id`, `local_date`);
