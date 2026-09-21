import { createClient } from '@supabase/supabase-js';
import { authConfig } from './auth-config';

// Never trust caller-supplied account IDs or decode a JWT without verification.
export async function getParticipant(request: Request): Promise<{ userId: string } | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
  if (!match || match[1].length > 8192) return null;
  const { url, key } = authConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error) {
    if (error.status === 401 || error.status === 403 || error.status === 400) return null;
    throw new Error('Identity service temporarily unavailable');
  }
  if (!data.user?.id || !data.user.email_confirmed_at || data.user.is_anonymous) return null;
  return { userId: 'supabase:' + data.user.id };
}
