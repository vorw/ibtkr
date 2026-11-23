import { weeklyChallenges } from './weekly';

// No raw identity fields are returned to the browser. A participant's score is
// the sum of genuine likes on all their entries in this challenge, across angles.
export const scoresSQL = `SELECT i.user_id,COALESCE(p.display_name,MAX(i.name)) name,
  COUNT(DISTINCT i.id) entries,COALESCE(SUM(r.liked),0) likes
  FROM ideas i LEFT JOIN reactions r ON r.idea_id=i.id AND r.liked=1 AND r.user_id<>i.user_id
  LEFT JOIN profiles p ON p.user_id=i.user_id WHERE i.challenge_id=? GROUP BY i.user_id`;

export async function finalizeClosedWeeks(db: D1Database, now = new Date()) {
  const time = now.toISOString();
  const closed = weeklyChallenges.filter((week) => week.endsAt <= time);
  if (!closed.length) return;
  const finalized = new Set(
    (
      await db
        .prepare(
          `SELECT challenge_id FROM finalized_weeks WHERE challenge_id IN (${closed.map(() => '?').join(',')})`,
        )
        .bind(...closed.map((week) => week.id))
        .all<{ challenge_id: string }>()
    ).results.map((row) => row.challenge_id),
  );
  for (const week of closed) {
    if (finalized.has(week.id)) continue;
    // One atomic batch, repeat-safe even if the cron and a visitor run together.
    await db.batch([
      db
        .prepare(
          `INSERT OR IGNORE INTO weekly_results (challenge_id,user_id,name,likes,entries,rank,finalized_at)
        SELECT ?,user_id,name,likes,entries,RANK() OVER (ORDER BY likes DESC),?
        FROM (${scoresSQL}) WHERE NOT EXISTS (SELECT 1 FROM finalized_weeks WHERE challenge_id=?)`,
        )
        .bind(week.id, time, week.id, week.id),
      db
        .prepare(
          'INSERT OR IGNORE INTO finalized_weeks (challenge_id,finalized_at) VALUES (?,?)',
        )
        .bind(week.id, time),
    ]);
  }
}
