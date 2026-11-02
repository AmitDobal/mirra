CREATE TABLE `badge_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`ladder` text NOT NULL,
	`tier` integer NOT NULL,
	`title` text NOT NULL,
	`rule_json` text NOT NULL,
	`stitch_asset_key` text
);
--> statement-breakpoint
CREATE TABLE `user_badges` (
	`user_id` text NOT NULL,
	`badge_id` text NOT NULL,
	`unlocked_at` integer NOT NULL,
	`meta_json` text,
	PRIMARY KEY(`user_id`, `badge_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`badge_id`) REFERENCES `badge_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `badge_definitions` (`id`, `ladder`, `tier`, `title`, `rule_json`, `stitch_asset_key`) VALUES
	('rank_spark', 'kinetic_rank', 1, 'Spark', '{"type":"streak_gte","n":7}', 's33_spark'),
	('rank_ember', 'kinetic_rank', 2, 'Ember', '{"type":"streak_gte","n":14}', 's33_ember'),
	('rank_forge', 'kinetic_rank', 3, 'Forge', '{"type":"streak_gte","n":30}', 's33_forge'),
	('rank_volt', 'kinetic_rank', 4, 'Volt', '{"type":"streak_gte","n":60}', 's33_volt'),
	('rank_apex', 'kinetic_rank', 5, 'Apex', '{"type":"streak_gte","n":100}', 's33_apex');
