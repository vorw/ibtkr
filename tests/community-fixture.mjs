import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export const state = { user: null, db: null, failReads: false, failReadAfterWrite: false };
export function resetDatabase() {
  state.db?.close();
  state.db = new DatabaseSync(':memory:');
  state.db.exec(readFileSync(new URL('../drizzle/0000_purple_toad.sql', import.meta.url), 'utf8'));
  state.user = 'alice'; state.failReads = false; state.failReadAfterWrite = false;
}
export async function getParticipant() {
  return state.user ? { userId: state.user, email: state.user + '@example.test' } : null;
}
export function database() {
  return { prepare(sql) {
    const statement = state.db.prepare(sql);
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
