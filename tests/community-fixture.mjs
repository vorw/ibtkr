import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export const state = { user: null, db: null, failReads: false, failReadAfterWrite: false, databaseNow: '2026-10-12T12:00:00.000Z' };
export function resetDatabase({ weekly = true, opened = true } = {}) {
  state.db?.close();
  state.db = new DatabaseSync(':memory:');
  for (const file of ['../drizzle/0000_purple_toad.sql', '../drizzle/0001_unique_profiles.sql', ...(weekly ? ['../drizzle/0002_weekly_challenges.sql'] : [])]) {
    state.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  state.db.exec(readFileSync(new URL('../drizzle/0006_opening_ceremony.sql',import.meta.url),'utf8'));
  if(opened){
    state.db.prepare('INSERT INTO opening_events VALUES (?,?,?)').run('ribbon-natural-test-2026-10-07',2,'2026-10-06T21:00:00.000Z');
    for(const user of ['fixture-opener-1','fixture-opener-2'])state.db.prepare('INSERT INTO opening_cuts VALUES (?,?,?)').run('ribbon-natural-test-2026-10-07',user,'2026-10-06T21:00:00.000Z');
  }
  state.databaseNow = '2026-10-12T12:00:00.000Z';
  state.db.function('test_now', () => state.databaseNow);
  state.user = 'alice'; state.failReads = false; state.failReadAfterWrite = false;
}
export async function getParticipant() {
  return state.user ? { userId: state.user, email: state.user + '@example.test' } : null;
}
let batchQueue = Promise.resolve();
export function database() {
  return { async batch(statements) {
    const task = batchQueue.then(async () => {
      state.db.exec('BEGIN');
      try {
        const results = [];
        for (const prepared of statements) results.push(await prepared.run());
        state.db.exec('COMMIT');
        return results;
      } catch (error) { state.db.exec('ROLLBACK'); throw error; }
    });
    batchQueue = task.catch(() => {});
    return task;
  }, prepare(sql) {
    const statement = () => state.db.prepare(sql.replaceAll("'now'", 'test_now()'));
    const prepared = (values = []) => ({
      bind: (...args) => prepared(args),
      async all() { if (state.failReads) throw Error('Simulated read failure'); return { results: statement().all(...values) }; },
      async first() { if (state.failReads) throw Error('Simulated read failure'); return statement().get(...values) ?? null; },
      async run() {
        const result = statement().run(...values);
        if (state.failReadAfterWrite) state.failReads = true;
        return { success: true, meta: { changes: result.changes } };
      },
    });
    return prepared();
  } };
}
