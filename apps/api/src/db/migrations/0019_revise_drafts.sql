CREATE TABLE `revise_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`date` text NOT NULL,
	`intent_json` text NOT NULL,
	`items_json` text NOT NULL,
	`prefs_patch_json` text,
	`meal_draft_json` text,
	`workout_draft_json` text,
	`schedule_draft_json` text,
	`base_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`applied_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `revise_drafts_user_status_idx` ON `revise_drafts` (`user_id`,`status`);
