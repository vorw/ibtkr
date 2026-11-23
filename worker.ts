// Cloudflare entry point. Maintenance can replace HTTP responses. The scheduled
// path exits during maintenance, otherwise finalizes weeks and processes emails.

import handler from "vinext/server/fetch-handler";
import { finalizeClosedWeeks } from "./lib/weekly-db";
import { ensureWeeklySchema } from "./lib/weekly-schema";
import { runWeeklyEmailJob, type WeeklyEmailEnv } from "./lib/weekly-email";
import { isMaintenanceActive, maintenanceResponse } from "./lib/maintenance";

export default {
  fetch(...args: Parameters<typeof handler.fetch>) {
    return maintenanceResponse(args[0]) ?? handler.fetch(...args);
  },
  async scheduled(_controller: ScheduledController, env: WeeklyEmailEnv) {
    if (isMaintenanceActive()) return;
    await ensureWeeklySchema(env.DB);
    await finalizeClosedWeeks(env.DB);
    await runWeeklyEmailJob(env);
  },
};
