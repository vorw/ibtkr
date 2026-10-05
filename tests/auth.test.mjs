import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { registerHooks } from 'node:module';
import { env } from './auth-fixture.mjs';
registerHooks({ resolve(specifier, context, next) {
  const aliases = {
    'cloudflare:workers': './auth-fixture.mjs',
    './auth-config': '../lib/auth-config.ts',
    './participation': '../lib/participation.ts',
  };
  if (aliases[specifier]) return { url: new URL(aliases[specifier], import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { getParticipant } = await import('../lib/auth-server.ts');
const { authConfig } = await import('../lib/auth-config.ts');
const { loginReturn } = await import('../lib/login-return.ts');
const originalFetch = globalThis.fetch;
let calls = [];
let status = 200;
let user;
beforeEach(() => {
  calls = []; status = 200;
  user = { id: 'ca99e562-6bc9-4fbc-b93b-21b582de1266', email: 'private@example.test', email_confirmed_at: '2026-09-21T00:00:00Z', is_anonymous: false };
  env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init.headers) });
    return Response.json(status === 200 ? user : { msg: 'Test auth error' }, { status });
  };
});
afterEach(() => { globalThis.fetch = originalFetch; });
const request = headers => new Request('https://ibtkr.space/api/community', { headers });

test('guest and spoofed former identity headers never authorize a participant', async () => {
  assert.equal(await getParticipant(request({})), null);
  assert.equal(await getParticipant(request({ 'oai-authenticated-user-id': 'victim', 'oai-authenticated-user-email': 'victim@example.test' })), null);
  assert.equal(calls.length, 0);
});
test('rejects malformed authorization without contacting the identity service', async () => {
  for (const authorization of ['Basic abc', 'Bearer bad token', 'Bearer ' + 'a'.repeat(8193)]) assert.equal(await getParticipant(request({ authorization })), null);
  assert.equal(calls.length, 0);
});
test('validates the token remotely and returns only the namespaced verified ID', async () => {
  assert.deepEqual(await getParticipant(request({ authorization: 'Bearer signed.test.token' })), { userId: 'supabase:' + user.id });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://test-project.supabase.co/auth/v1/user');
  assert.equal(calls[0].headers.get('authorization'), 'Bearer signed.test.token');
  assert.equal(calls[0].headers.get('apikey'), 'sb_publishable_test');
});
test('expired and invalid tokens do not authorize participation', async () => {
  for (const code of [400, 401, 403]) { status = code; assert.equal(await getParticipant(request({ authorization: 'Bearer invalid.token' })), null); }
});
test('unconfirmed or anonymous accounts do not authorize participation', async () => {
  user.email_confirmed_at = null;
  assert.equal(await getParticipant(request({ authorization: 'Bearer signed.token' })), null);
  user.email_confirmed_at = '2026-09-21'; user.is_anonymous = true;
  assert.equal(await getParticipant(request({ authorization: 'Bearer signed.token' })), null);
});
test('auth service outage fails closed without pretending the token is invalid', async () => {
  status = 503;
  await assert.rejects(getParticipant(request({ authorization: 'Bearer signed.token' })), /temporarily unavailable/);
});
test('public configuration refuses a server secret', () => {
  env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_never_send_to_browser';
  assert.throws(authConfig, /configuration missing/);
});
test('login only returns to approved internal views and preserves the draft context', () => {
  for (const value of [null, 'https://evil.test', '//evil.test', '/\\evil.test', '/login', '/?view=ideas\\evil']) assert.equal(loginReturn(value), '/');
  assert.equal(loginReturn('/?view=ideas&compose=week-2026-09-30&untrusted=value'), '/?view=ideas&compose=week-2026-09-30');
  assert.equal(loginReturn('/?view=unknown&compose=unknown'), '/?view=home');
});
