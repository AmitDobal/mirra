CREATE TABLE `goal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`goal_type` text NOT NULL,
	`primary_goal` text NOT NULL,
	`pace` text,
	`direction` text NOT NULL,
	`mode` text NOT NULL,
	`start_date` text NOT NULL,
	`start_weight_kg` real,
	`target_weight_kg` real,
	`target_effective_kg` real,
	`pace_rate_pct` real NOT NULL,
	`pace_rate_kg` real NOT NULL,
	`kcal_hint` integer,
	`eta_expected` text,
	`eta_optimistic` text,
	`eta_conservative` text,
	`weeks_expected` real,
	`planned_line_json` text NOT NULL,
	`flags_json` text DEFAULT '[]' NOT NULL,
	`inputs_json` text NOT NULL,
	`engine_version` text NOT NULL,
	`reason` text NOT NULL,
	`committed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_plans_user_version_uq` ON `goal_plans` (`user_id`,`version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_plans_active_uq` ON `goal_plans` (`user_id`) WHERE "goal_plans"."status" = 'active';
--> statement-breakpoint
CREATE TABLE `goal_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_plan_id` text NOT NULL,
	`local_date` text NOT NULL,
	`trend_weight_kg` real,
	`observed_rate_kg` real,
	`trend_span_days` integer,
	`adherence` real NOT NULL,
	`adherence_json` text NOT NULL,
	`status` text NOT NULL,
	`eta_expected` text,
	`eta_optimistic` text,
	`eta_conservative` text,
	`what_if_eta` text,
	`milestones_json` text NOT NULL,
	`trigger` text NOT NULL,
	`engine_version` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_plan_id`) REFERENCES `goal_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_snapshots_user_date_uq` ON `goal_snapshots` (`user_id`,`local_date`);
--> statement-breakpoint
CREATE INDEX `goal_snapshots_plan_idx` ON `goal_snapshots` (`goal_plan_id`,`local_date`);
