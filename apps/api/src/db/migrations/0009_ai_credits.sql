-- AMI-125 AI credits core. Number 0009 on purpose: 0008 is reserved for AMI-124 (attendance).
CREATE TABLE `ai_credit_periods` (
	`user_id` text NOT NULL,
	`period` text NOT NULL,
	`granted` integer DEFAULT 0 NOT NULL,
	`bonus` integer DEFAULT 0 NOT NULL,
	`spent` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `period`)
);
--> statement-breakpoint
CREATE TABLE `ai_credit_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period` text NOT NULL,
	`feature` text NOT NULL,
	`credits_reserved` integer NOT NULL,
	`credits_settled` integer,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`usage_event_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`settled_at` integer
);
--> statement-breakpoint
CREATE INDEX `ai_credit_reservations_user_status_idx` ON `ai_credit_reservations` (`user_id`, `status`);
--> statement-breakpoint
CREATE INDEX `ai_credit_reservations_user_period_feature_idx` ON `ai_credit_reservations` (`user_id`, `period`, `feature`);
--> statement-breakpoint
CREATE TABLE `ai_credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period` text NOT NULL,
	`delta` integer NOT NULL,
	`kind` text NOT NULL,
	`feature` text,
	`reservation_id` text,
	`ref_id` text,
	`idempotency_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_credit_ledger_user_period_idx` ON `ai_credit_ledger` (`user_id`, `period`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_credit_ledger_user_idem_uq` ON `ai_credit_ledger` (`user_id`, `idempotency_key`);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_code_uq` ON `referral_codes` (`code`);
--> statement-breakpoint
CREATE TABLE `referral_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_user_id` text NOT NULL,
	`referee_user_id` text NOT NULL,
	`status` text NOT NULL,
	`credits_awarded` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_redemptions_referee_uq` ON `referral_redemptions` (`referee_user_id`);
