CREATE TABLE `user_streaks` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`current_count` integer DEFAULT 0 NOT NULL,
	`best_count` integer DEFAULT 0 NOT NULL,
	`last_active_date` text,
	`freeze_remaining` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `kind`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_streaks_user_idx` ON `user_streaks` (`user_id`);
