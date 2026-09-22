CREATE TABLE `profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `display_name` text NOT NULL,
  `name_key` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_name_key` ON `profiles` (`name_key`);
