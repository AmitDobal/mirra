CREATE TABLE `ai_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`estimated_micros` integer DEFAULT 0 NOT NULL,
	`meta_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_user_created_idx` ON `ai_usage_events` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_user_feature_created_idx` ON `ai_usage_events` (`user_id`, `feature`, `created_at`);
--> statement-breakpoint
CREATE TABLE `ai_usage_daily` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`feature` text NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_micros` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `feature`)
);
--> statement-breakpoint
CREATE TABLE `voice_cue_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`text` text NOT NULL,
	`voice_id` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
