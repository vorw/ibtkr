import migration from '../drizzle/0004_weekly_email_deliveries.sql?raw';

const ready = new WeakMap<D1Database, Promise<void>>();
export async function ensureWeeklyEmailSchema(db: D1Database) {
  let task = ready.get(db);
  if (!task) {
    task = (async () => {
      const name = '0004_weekly_email_deliveries.sql';
      if (await db.prepare('SELECT name FROM d1_migrations WHERE name=?').bind(name).first()) return;
      await db.batch([
        ...migration.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean).map(sql => db.prepare(sql)),
        db.prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)').bind(name),
      ]);
    })();
    ready.set(db, task);
  }
  try { await task; } catch (error) { ready.delete(db); throw error; }
}
