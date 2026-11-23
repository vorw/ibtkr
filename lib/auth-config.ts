// Reads only the public authentication configuration. The secret admin key must
// never be returned by this helper or sent to the browser.

import { env } from 'cloudflare:workers';

export function authConfig() {
  const values = env as unknown as Record<string, string | undefined>;
  const url = values.SUPABASE_URL;
  const key = values.SUPABASE_PUBLISHABLE_KEY;
  if (
    !url ||
    !key ||
    !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ||
    !key.startsWith('sb_publishable_')
  ) {
    throw new Error('Authentication configuration missing');
  }
  return {
    url: url.replace(/\/$/, ''),
    key,
    captchaSiteKey: values.TURNSTILE_SITE_KEY ?? '',
  };
}
