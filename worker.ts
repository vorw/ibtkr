import handler from 'vinext/server/fetch-handler';
import { finalizeClosedWeeks } from './lib/weekly-db';

export default {
  fetch: handler.fetch,
  async scheduled(_controller: ScheduledController, env: { DB: D1Database }) {
    await finalizeClosedWeeks(env.DB);
  },
};
