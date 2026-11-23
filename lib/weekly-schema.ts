// Compatibility migrations for the existing D1 database. Recorded migration
// names prevent older cleanup/archiving work from being replayed.

import migration from '../drizzle/0002_weekly_challenges.sql?raw';
import legacyReset from '../drizzle/0003_clear_legacy_activity.sql?raw';
import launchReset from '../drizzle/0005_launch_week_one.sql?raw';

const migrationName = '0002_weekly_challenges.sql';
const ready = new WeakMap<D1Database, Promise<void>>();
const statements = migration
  .split('--> statement-breakpoint')
  .map((sql) => sql.trim())
  .filter(Boolean)
  .map((sql) =>
    sql
      .replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS '),
  );

// Git-connected Worker releases may only deploy code. Apply the same additive
// migration before any weekly query, and record it for later Wrangler releases.
export async function ensureWeeklySchema(db: D1Database): Promise<void> {
  let task = ready.get(db);
  if (!task) {
    task = upgrade(db)
      .then(() => clearLegacyActivity(db))
      .then(() => archiveTestRound(db));
    ready.set(db, task);
  }
  try {
    await task;
  } catch (error) {
    ready.delete(db);
    throw error;
  }
}

async function archiveTestRound(db: D1Database) {
  const name = '0005_launch_week_one.sql';
  if (
    await db
      .prepare('SELECT name FROM d1_migrations WHERE name=?')
      .bind(name)
      .first()
  )
    return;
  // Recoverable private backups and active-data removal commit together.
  // Every statement is guarded so concurrent isolates cannot repeat the reset.
  await db.batch([
    ...launchReset
      .split('--> statement-breakpoint')
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
    db
      .prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)')
      .bind(name),
  ]);
}

async function clearLegacyActivity(db: D1Database) {
  const name = '0003_clear_legacy_activity.sql';
  if (
    await db
      .prepare('SELECT name FROM d1_migrations WHERE name=?')
      .bind(name)
      .first()
  )
    return;
  // Children, parents and marker change atomically. Points and achievements
  // derive from remaining activity; profiles and authentication stay untouched.
  await db.batch([
    ...legacyReset
      .split('--> statement-breakpoint')
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
    db
      .prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)')
      .bind(name),
  ]);
}

async function upgrade(db: D1Database) {
  const ledger = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations'",
    )
    .first();
  if (
    ledger &&
    (await db
      .prepare('SELECT name FROM d1_migrations WHERE name=?')
      .bind(migrationName)
      .first())
  )
    return;
  const hasAngle = async () =>
    (
      await db.prepare('PRAGMA table_info(ideas)').all<{ name: string }>()
    ).results.some((column) => column.name === 'angle_id');
  const apply = async (angleExists: boolean) =>
    db.batch([
      ...statements
        .filter((sql) => !angleExists || !sql.startsWith('ALTER TABLE'))
        .map((sql) => db.prepare(sql)),
      db.prepare(`CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
      db
        .prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)')
        .bind(migrationName),
    ]);
  const angleExists = await hasAngle();
  try {
    await apply(angleExists);
  } catch (error) {
    // Two new isolates can inspect the old schema concurrently. D1 batches are
    // transactional; only retry this specific race after verifying the column.
    if (
      angleExists ||
      !String(error).toLowerCase().includes('duplicate column name') ||
      !(await hasAngle())
    )
      throw error;
    await apply(true);
  }
}
