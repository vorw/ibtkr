CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comments_idea` ON `comments` (`idea_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user` ON `comments` (`user_id`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ideas_user` ON `ideas` (`user_id`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`idea_id` text NOT NULL,
	`user_id` text NOT NULL,
	`liked` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`idea_id`, `user_id`),
	FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON UPDATE no action ON DELETE no action
);
