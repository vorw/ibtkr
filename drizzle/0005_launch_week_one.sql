-- Archive the retired test round before clearing public activity and derived XP.
-- Accounts, launch-week participation and sent-email receipts are preserved.
CREATE TABLE IF NOT EXISTS launch_test_archive_ideas AS SELECT * FROM ideas WHERE 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS launch_test_archive_comments AS SELECT * FROM comments WHERE 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS launch_test_archive_reactions AS SELECT * FROM reactions WHERE 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS launch_test_archive_weekly_results AS SELECT * FROM weekly_results WHERE 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS launch_test_archive_finalized_weeks AS SELECT * FROM finalized_weeks WHERE 0;
--> statement-breakpoint
INSERT INTO launch_test_archive_ideas SELECT * FROM ideas WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
INSERT INTO launch_test_archive_comments SELECT * FROM comments WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id = 'week-2026-09-30') AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
INSERT INTO launch_test_archive_reactions SELECT * FROM reactions WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id = 'week-2026-09-30') AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
INSERT INTO launch_test_archive_weekly_results SELECT * FROM weekly_results WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
INSERT INTO launch_test_archive_finalized_weeks SELECT * FROM finalized_weeks WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
DELETE FROM reactions WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id = 'week-2026-09-30') AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
DELETE FROM comments WHERE idea_id IN (SELECT id FROM ideas WHERE challenge_id = 'week-2026-09-30') AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
DELETE FROM ideas WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
DELETE FROM weekly_results WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
--> statement-breakpoint
DELETE FROM finalized_weeks WHERE challenge_id = 'week-2026-09-30' AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_launch_week_one.sql');
