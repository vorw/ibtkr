import migration from '../drizzle/0006_opening_ceremony.sql?raw';

// A new event ID starts a new ceremony without destroying the previous test.
// Set enabled=false to remove the gate after review; weekly operations are separate.
export const openingConfig = { id: 'ribbon-test-2026-10-07', target: 2, enabled: true };
export type OpeningState = {
  eventId: string; target: number; count: number; isOpen: boolean;
  signedIn: boolean; hasCut: boolean; openedAt: string | null;
};
const ready = new WeakMap<D1Database, Promise<void>>();
async function ensureOpening(db: D1Database) {
  let task = ready.get(db);
  if (!task) {
    task = db.batch([
      ...migration.split('--> statement-breakpoint').map(sql=>sql.trim()).filter(Boolean).map(sql=>db.prepare(sql)),
      db.prepare('INSERT OR IGNORE INTO opening_events (id,target) VALUES (?,?)').bind(openingConfig.id,openingConfig.target),
    ]).then(()=>{});
    ready.set(db,task);
  }
  try { await task; } catch(error) { ready.delete(db);throw error; }
}

export async function readOpening(db: D1Database, userId: string | null): Promise<OpeningState> {
  if (!openingConfig.enabled) return {eventId:openingConfig.id,target:openingConfig.target,count:0,isOpen:true,signedIn:Boolean(userId),hasCut:false,openedAt:null};
  await ensureOpening(db);
  // One snapshot: never show a stale count alongside a newly opened event.
  const row = await db.prepare(`SELECT e.target,e.opened_at,
    (SELECT COUNT(*) FROM opening_cuts WHERE event_id=e.id) count,
    EXISTS(SELECT 1 FROM opening_cuts WHERE event_id=e.id AND user_id=?) has_cut
    FROM opening_events e WHERE e.id=?`).bind(userId,openingConfig.id)
    .first<{target:number;opened_at:string|null;count:number;has_cut:number}>();
  if(!row)throw new Error('Opening state unavailable');
  return {eventId:openingConfig.id,target:row.target,count:row.count,isOpen:row.opened_at!==null,
    signedIn:Boolean(userId),hasCut:Boolean(row.has_cut),openedAt:row.opened_at};
}

export async function cutOpening(db: D1Database, userId: string, now = new Date()): Promise<OpeningState> {
  if(!userId)throw new Error('Verified account required');
  if (!openingConfig.enabled) return readOpening(db,userId);
  await ensureOpening(db);
  const time=now.toISOString();
  // Unique accounts, bounded count and the final opening change commit together.
  // Retries and simultaneous final cuts cannot reset or overshoot the ceremony.
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO opening_cuts (event_id,user_id,cut_at)
      SELECT id,?,? FROM opening_events WHERE id=? AND opened_at IS NULL
      AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)<target`)
      .bind(userId,time,openingConfig.id),
    db.prepare(`UPDATE opening_events SET opened_at=? WHERE id=? AND opened_at IS NULL
      AND (SELECT COUNT(*) FROM opening_cuts WHERE event_id=opening_events.id)>=target`)
      .bind(time,openingConfig.id),
  ]);
  return readOpening(db,userId);
}
