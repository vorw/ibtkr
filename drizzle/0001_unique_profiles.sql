CREATE TABLE `profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `display_name` text NOT NULL,
  `name_key` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_name_key` ON `profiles` (`name_key`);
--> statement-breakpoint
WITH legacy_names AS (
  SELECT user_id, name, created_at FROM ideas
  UNION ALL
  SELECT user_id, name, created_at FROM comments
),
ranked_names AS (
  SELECT
    user_id,
    name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, name DESC) AS position
  FROM legacy_names
)
INSERT OR IGNORE INTO profiles (user_id, display_name, name_key, created_at, updated_at)
SELECT
  user_id,
  trim(name),
  lower(trim(replace(name, 'ـ', ''))),
  created_at,
  created_at
FROM ranked_names
WHERE position = 1 AND length(trim(name)) >= 2;
