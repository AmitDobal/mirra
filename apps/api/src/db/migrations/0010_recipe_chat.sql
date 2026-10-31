-- AMI-127 Chef / recipe chat. 0010 on purpose: 0008 reserved for AMI-124, 0009 is AMI-125 credits.
CREATE TABLE `recipe_chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_item_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`turn_count` integer DEFAULT 0 NOT NULL,
	`max_turns` integer DEFAULT 8 NOT NULL,
	`recipe_json` text,
	`recipe_key` text,
	`recipe_source` text,
	`context_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_item_id`) REFERENCES `meal_plan_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_chat_threads_user_item_uq` ON `recipe_chat_threads` (`user_id`, `plan_item_id`);
--> statement-breakpoint
CREATE TABLE `recipe_chat_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`idx` integer NOT NULL,
	`role` text NOT NULL,
	`text` text NOT NULL,
	`client_request_id` text,
	`source` text,
	`credits_charged` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `recipe_chat_threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_chat_turns_thread_idx_uq` ON `recipe_chat_turns` (`thread_id`, `idx`);
--> statement-breakpoint
CREATE INDEX `recipe_chat_turns_thread_req_idx` ON `recipe_chat_turns` (`thread_id`, `client_request_id`);
