import handler from 'vinext/server/fetch-handler';
import { finalizeClosedWeeks } from './lib/weekly-db';
import { ensureWeeklySchema } from './lib/weekly-schema';
import { runWeeklyEmailJob, type WeeklyEmailEnv } from './lib/weekly-email';

export default {
  fetch: handler.fetch,
  async scheduled(_controller: ScheduledController, env: WeeklyEmailEnv) {
    await ensureWeeklySchema(env.DB);
    await finalizeClosedWeeks(env.DB);
    await runWeeklyEmailJob(env);
  },
};
