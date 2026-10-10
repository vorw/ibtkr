import migration from '../drizzle/0006_opening_ceremony.sql?raw';
import visitorMigration from '../drizzle/0007_opening_visitors.sql?raw';

// Restarted official event; previous contributions remain archived.
export const openingConfig = { id: 'ibtkr-official-opening-2026-10-10-reset-1', target: 10, enabled: true };
export type OpeningState = {
  eventId: string; target: number; count: number; isOpen: boolean;
  canCut: boolean; hasCut: boolean; position: number | null; openedAt: string | null;
};
const ready = new WeakMap<D1Database, Promise<void>>();
async function ensureOpening(db: D1Database) {
  let task = ready.get(db);
  if (!task) {
    task = db.batch([
      ...[migration,visitorMigration].flatMap(source=>source.split('--> statement-breakpoint')).map(sql=>sql.trim()).filter(Boolean).map(sql=>db.prepare(sql)),
      db.prepare('INSERT OR IGNORE INTO opening_events (id,target) VALUES (?,?)').bind(openingConfig.id,openingConfig.target),
      // Apply a changed target to the existing event without resetting cuts or
      // its opening timestamp. A lower target can complete the ceremony now.
      db.prepare('UPDATE opening_events SET target=? WHERE id=? AND target<>?').bind(openingConfig.target,openingConfig.id,openingConfig.target),
      db.prepare(`UPDATE opening_events SET opened_at=? WHERE id=? AND opened_at IS NULL
        AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)>=target`)
        .bind(new Date().toISOString(),openingConfig.id),
    ]).then(()=>{});
    ready.set(db,task);
  }
  try { await task; } catch(error) { ready.delete(db);throw error; }
}

export async function resolveOpeningVisitor(db: D1Database, value: string | null): Promise<string | null> {
  if(!value||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))return null;
  await ensureOpening(db);
  const row=await db.prepare('SELECT id FROM opening_visitors WHERE id=? AND event_id=?').bind(value,openingConfig.id).first<{id:string}>();
  return row?.id??null;
}
export async function createOpeningVisitor(db: D1Database): Promise<string> {
  await ensureOpening(db);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO opening_visitors (id,event_id,created_at) VALUES (?,?,?)').bind(id,openingConfig.id,new Date().toISOString()).run();
  return id;
}

export async function readOpening(db: D1Database, visitorId: string | null): Promise<OpeningState> {
  if (!openingConfig.enabled) return {eventId:openingConfig.id,target:openingConfig.target,count:0,isOpen:true,canCut:false,hasCut:false,position:null,openedAt:null};
  await ensureOpening(db);
  // One snapshot, including the contribution's private arrival order.
  const row = await db.prepare(`SELECT e.target,e.opened_at,
    (SELECT COUNT(*) FROM opening_cuts WHERE event_id=e.id) count,
    (SELECT rowid FROM opening_cuts WHERE event_id=e.id AND user_id=?) own_row,
    (SELECT COUNT(*) FROM opening_cuts c WHERE c.event_id=e.id AND c.rowid<=
      (SELECT rowid FROM opening_cuts WHERE event_id=e.id AND user_id=?)) position
    FROM opening_events e WHERE e.id=?`).bind(visitorId,visitorId,openingConfig.id)
    .first<{target:number;opened_at:string|null;count:number;own_row:number|null;position:number}>();
  if(!row)throw new Error('Opening state unavailable');
  const hasCut=row.own_row!==null,isOpen=row.opened_at!==null;
  return {eventId:openingConfig.id,target:row.target,count:row.count,isOpen,
    canCut:Boolean(visitorId)&&!hasCut&&!isOpen,hasCut,position:hasCut?row.position:null,openedAt:row.opened_at};
}

export async function cutOpening(db: D1Database, visitorId: string, now = new Date()): Promise<OpeningState> {
  if(!await resolveOpeningVisitor(db,visitorId))throw new Error('Opening visitor not initialized');
  if (!openingConfig.enabled) return readOpening(db,visitorId);
  const time=now.toISOString();
  // Each server-issued browser token contributes once. Count and opening commit together.
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO opening_cuts (event_id,user_id,cut_at)
      SELECT id,?,? FROM opening_events WHERE id=? AND opened_at IS NULL
      AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)<target`)
      .bind(visitorId,time,openingConfig.id),
    db.prepare(`UPDATE opening_events SET opened_at=? WHERE id=? AND opened_at IS NULL
      AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)>=target`)
      .bind(time,openingConfig.id),
  ]);
  return readOpening(db,visitorId);
}
