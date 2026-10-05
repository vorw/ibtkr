import handler from 'vinext/server/fetch-handler';
import { finalizeClosedWeeks } from './lib/weekly-db';
import { ensureWeeklySchema } from './lib/weekly-schema';

export default {
  fetch: handler.fetch,
  async scheduled(_controller: ScheduledController, env: { DB: D1Database }) {
    await ensureWeeklySchema(env.DB);
    await finalizeClosedWeeks(env.DB);
  },
};
