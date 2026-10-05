-- User-authorized clean start for the former three-problem programme.
-- Keep profiles, authentication and all new weekly activity intact.
-- Guards make concurrent first requests perform one reset.
DELETE FROM reactions
WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id IN ('queue', 'reverse', 'alone'))
AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0003_clear_legacy_activity.sql');
--> statement-breakpoint
DELETE FROM comments
WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id IN ('queue', 'reverse', 'alone'))
AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0003_clear_legacy_activity.sql');
--> statement-breakpoint
DELETE FROM ideas
WHERE challenge_id IN ('queue', 'reverse', 'alone')
AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0003_clear_legacy_activity.sql');
--> statement-breakpoint
DELETE FROM weekly_results
WHERE challenge_id IN ('queue', 'reverse', 'alone')
AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0003_clear_legacy_activity.sql');
--> statement-breakpoint
DELETE FROM finalized_weeks
WHERE challenge_id IN ('queue', 'reverse', 'alone')
AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0003_clear_legacy_activity.sql');
