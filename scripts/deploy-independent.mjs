import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const config = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
if (!config.d1_databases?.[0]?.database_id || config.d1_databases[0].database_id.startsWith('00000000')) throw Error('Create your Cloudflare D1 database and set its real database_id before deploying.');
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.vars?.SUPABASE_URL ?? '') || !config.vars?.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw Error('Configure the Supabase project URL and publishable key before deploying. Never use a secret/service-role key.');
if (!config.vars?.TURNSTILE_SITE_KEY) throw Error('Configure Turnstile and enable it in Supabase Auth before launching.');
for (const args of [
  ['node_modules/vinext/dist/cli.js', 'build'],
  ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--remote'],
  ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'dist/server/wrangler.json'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: new URL('..', import.meta.url) });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
