'use client';

// Browser-side sign-in client. This file attaches a session token to API requests;
// the server still verifies that token before trusting the account.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublicAuthConfig = {
  url: string;
  key: string;
  captchaSiteKey: string;
};
let pending:
  | Promise<{ client: SupabaseClient; config: PublicAuthConfig }>
  | undefined;

export function getAuth() {
  if (!pending)
    pending = (async () => {
      const response = await fetch('/api/auth/config', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error('الدخول غير متاح حاليًا. جرّب مرة ثانية بعد قليل.');
      const config = (await response.json()) as PublicAuthConfig;
      const client = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'ibtkr-session',
        },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
        },
      });
      return { client, config };
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

export async function sessionHeaders(): Promise<Record<string, string>> {
  const { client } = await getAuth();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('تعذّر التحقق من الدخول. أعد المحاولة.');
  return data.session
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

export async function signOut() {
  const { client } = await getAuth();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw new Error('تعذّر تسجيل الخروج. أعد المحاولة.');
}
