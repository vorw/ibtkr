import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export const state = { user: null, db: null, failReads: false, failReadAfterWrite: false, databaseNow: '2026-10-05T12:00:00.000Z' };
export function resetDatabase() {
  state.db?.close();
  state.db = new DatabaseSync(':memory:');
  for (const file of ['../drizzle/0000_purple_toad.sql', '../drizzle/0001_unique_profiles.sql','../drizzle/0002_weekly_challenges.sql']) {
    state.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  state.databaseNow = '2026-10-05T12:00:00.000Z';
  state.db.function('test_now', () => state.databaseNow);
  state.user = 'alice'; state.failReads = false; state.failReadAfterWrite = false;
}
export async function getParticipant() {
  return state.user ? { userId: state.user, email: state.user + '@example.test' } : null;
}
export function database() {
  return { async batch(statements){state.db.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());state.db.exec('COMMIT');return out;}catch(error){state.db.exec('ROLLBACK');throw error;}},prepare(sql) {
    const statement = state.db.prepare(sql.replaceAll("'now'", 'test_now()'));
    const prepared = (values = []) => ({
      bind: (...args) => prepared(args),
      async all() { if (state.failReads) throw Error('Simulated read failure'); return { results: statement.all(...values) }; },
      async first() { if (state.failReads) throw Error('Simulated read failure'); return statement.get(...values) ?? null; },
      async run() {
        const result = statement.run(...values);
        if (state.failReadAfterWrite) state.failReads = true;
        return { success: true, meta: { changes: result.changes } };
      },
    });
    return prepared();
  } };
}

