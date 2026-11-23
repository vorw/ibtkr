// Weekly question ribbon: keep accepted cuts under a stable event ID and
// reveal the question once the required browser visitors have contributed.

import { readOpening, type OpeningState } from '@/lib/opening';
import { weeklyRibbonFor, weeklyRibbonTarget } from './weekly-ribbon-policy';
import type { WeeklyChallenge } from './weekly';
async function ensure(db: D1Database, week: WeeklyChallenge) {
  const event = weeklyRibbonFor(week);
  if (!event) return null;
  await readOpening(db, null);
  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO opening_events (id,target) VALUES (?,?)')
      .bind(event.id, event.target),
    db
      .prepare('UPDATE opening_events SET target=? WHERE id=? AND target<>?')
      .bind(event.target, event.id, event.target),
    // Lowering the target must reveal a question that has already earned enough
    // cuts. Preserve every cut and never replace an existing opening timestamp.
    db
      .prepare(
        `UPDATE opening_events SET opened_at=? WHERE id=? AND opened_at IS NULL AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)>=target`,
      )
      .bind(new Date().toISOString(), event.id),
  ]);
  return event;
}
export async function weeklyVisitor(
  db: D1Database,
  week: WeeklyChallenge,
  value: string | null,
  create = false,
): Promise<string | null> {
  const event = await ensure(db, week);
  if (!event) return null;
  if (value && /^[0-9a-f-]{36}$/.test(value)) {
    const found = await db
      .prepare('SELECT id FROM opening_visitors WHERE id=? AND event_id=?')
      .bind(value, event.id)
      .first<{ id: string }>();
    if (found) return found.id;
  }
  if (!create) return null;
  const id = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO opening_visitors (id,event_id,created_at) VALUES (?,?,?)',
    )
    .bind(id, event.id, new Date().toISOString())
    .run();
  return id;
}
export async function readWeeklyOpening(
  db: D1Database,
  week: WeeklyChallenge,
  visitor: string | null = null,
): Promise<OpeningState> {
  const event = await ensure(db, week);
  if (!event)
    return {
      eventId: week.id,
      target: weeklyRibbonTarget,
      count: 0,
      isOpen: true,
      canCut: false,
      hasCut: false,
      position: null,
      openedAt: null,
    };
  const row = await db
    .prepare(
      `SELECT e.target,e.opened_at,
    (SELECT COUNT(*) FROM opening_cuts WHERE event_id=e.id) count,
    (SELECT COUNT(*) FROM opening_cuts WHERE event_id=e.id AND user_id=?) own,
    (SELECT COUNT(*) FROM opening_cuts c WHERE c.event_id=e.id AND c.rowid<=
      (SELECT rowid FROM opening_cuts WHERE event_id=e.id AND user_id=?)) position
    FROM opening_events e WHERE e.id=?`,
    )
    .bind(visitor, visitor, event.id)
    .first<{
      target: number;
      opened_at: string | null;
      count: number;
      own: number;
      position: number;
    }>();
  if (!row) throw Error('Weekly opening unavailable');
  return {
    eventId: event.id,
    target: row.target,
    count: row.count,
    isOpen: row.opened_at !== null,
    hasCut: row.own > 0,
    canCut: Boolean(visitor) && !row.own && !row.opened_at,
    position: row.own ? row.position : null,
    openedAt: row.opened_at,
  };
}
export async function cutWeeklyOpening(
  db: D1Database,
  week: WeeklyChallenge,
  visitor: string,
) {
  if (!(await weeklyVisitor(db, week, visitor)))
    throw Error('Weekly visitor not initialized');
  const event = weeklyRibbonFor(week)!;
  const time = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO opening_cuts (event_id,user_id,cut_at) SELECT id,?,? FROM opening_events WHERE id=? AND opened_at IS NULL AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)<target`,
      )
      .bind(visitor, time, event.id),
    db
      .prepare(
        `UPDATE opening_events SET opened_at=? WHERE id=? AND opened_at IS NULL AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)>=target`,
      )
      .bind(time, event.id),
  ]);
  return readWeeklyOpening(db, week, visitor);
}
export function concealWeeklyQuestion(week: WeeklyChallenge) {
  return {
    ...week,
    title: 'تحدّي الأسبوع… نفتحه معًا.',
    short: 'قصّاتكم تكشف التحدّي للجميع.',
    description: '',
    angles: [],
  };
}
