CREATE TABLE `finalized_weeks` (
	`challenge_id` text PRIMARY KEY NOT NULL,
	`finalized_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_results` (
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`likes` integer NOT NULL,
	`entries` integer NOT NULL,
	`rank` integer NOT NULL,
	`finalized_at` text NOT NULL,
	PRIMARY KEY(`challenge_id`, `user_id`)
);
--> statement-breakpoint
ALTER TABLE `ideas` ADD `angle_id` text;--> statement-breakpoint
CREATE INDEX `idx_ideas_week_created` ON `ideas` (`challenge_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_ideas_week_angle` ON `ideas` (`challenge_id`,`angle_id`,`created_at`);