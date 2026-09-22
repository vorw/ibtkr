import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { state, resetDatabase } from './community-fixture.mjs';

// Isolated test identities and SQLite; no production headers, account, or database are changed.
registerHooks({ resolve(specifier, context, next) {
  const aliases = {
    '@/lib/auth-server': './community-fixture.mjs',
    '@/lib/database': './community-fixture.mjs',
    '@/lib/challenges': '../lib/challenges.ts',
    '@/lib/profile': '../lib/profile.ts',
  };
  if (aliases[specifier]) return { url: new URL(aliases[specifier], import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });

const { GET, POST } = await import('../app/api/community/route.ts');
const { readResume, signInHref, readIdeaDraft } = await import('../lib/participation.ts');

const newIdea = (extra = {}) => ({
  action: 'idea',
  id: randomUUID(),
  challengeId: 'queue',
  title: 'فكرة للطابور',
  body: 'نضيف نشاطًا بسيطًا خلال انتظار الطلب.',
  ...extra,
});

async function post(payload, headers = {}) {
  const response = await POST(new Request('https://ftc.example.test/api/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://ftc.example.test', ...headers },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  }));
  return { status: response.status, body: await response.json() };
}

async function read() {
  return (await GET(new Request('https://ibtkr.space/api/community'))).json();
}

async function setProfile(displayName) {
  return post({ action: 'profile', displayName });
}

describe('Community operations against the real route and SQLite schema', () => {
  beforeEach(async () => {
    resetDatabase();
    const result = await setProfile('أحمد');
    assert.equal(result.status, 200);
  });

  after(() => state.db?.close());

  test('signed-out writes require identity; reads explicitly identify the guest', async () => {
    state.user = null;
    const guest = await read();
    assert.equal(guest.signedIn, false);
    assert.equal(guest.profile, null);
    for (const payload of [newIdea(), { action: 'edit' }, { action: 'comment' }, { action: 'react' }, { action: 'profile', displayName: 'سعود' }]) {
      assert.equal((await post(payload)).status, 401);
    }
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n, 0);
  });

  test('profile names are unique after normalization and can be changed safely', async () => {
    let data = await read();
    assert.deepEqual(data.profile, { displayName: 'أحمد' });

    state.user = 'bob';
    assert.equal((await setProfile(' أحمد ')).status, 409);
    assert.equal((await setProfile('أَحمد')).status, 409);
    assert.equal((await setProfile('احمد')).status, 409);
    assert.equal((await setProfile('محمد')).status, 200);

    state.user = 'alice';
    assert.equal((await setProfile('Louis')).status, 200);
    data = await read();
    assert.deepEqual(data.profile, { displayName: 'Louis' });

    state.user = 'bob';
    assert.equal((await setProfile('louis')).status, 409);
  });

  test('a profile is required before any community write', async () => {
    state.db.prepare('DELETE FROM profiles WHERE user_id=?').run('alice');
    const data = await read();
    assert.equal(data.profile, null);
    assert.equal((await post(newIdea())).status, 428);
    assert.equal((await post({ action: 'react', ideaId: randomUUID(), liked: true })).status, 428);
    assert.equal((await setProfile('س')).status, 400);
    assert.equal((await setProfile('سعود')).status, 200);
    assert.equal((await post(newIdea())).status, 200);
  });

  test('publishes and reloads normalized text, with 20 XP only once per challenge', async () => {
    const draft = newIdea({ title: '  بداية جيدة  ' });
    let result = await post(draft);
    assert.equal(result.status, 200);
    assert.equal(result.body.ideaId, draft.id);
    assert.equal(result.body.community.ideas[0].title, 'بداية جيدة');
    assert.equal(result.body.community.ideas[0].name, 'أحمد');
    assert.equal(result.body.community.progress.xp, 20);
    result = await post(newIdea());
    assert.deepEqual(result.body.community.progress, { ideas: 2, reviews: 0, xp: 20 });
    await post(newIdea({ challengeId: 'reverse' }));
    await post(newIdea({ challengeId: 'alone' }));
    assert.deepEqual((await read()).progress, { ideas: 4, reviews: 0, xp: 60 });
  });

  test('renaming an account updates old ideas and comments without rewriting their legacy name columns', async () => {
    const draft = newIdea();
    await post(draft);
    await post({ action: 'comment', id: randomUUID(), ideaId: draft.id, body: 'إضافة بسيطة على الفكرة.' });

    const beforeIdea = state.db.prepare('SELECT name FROM ideas WHERE id=?').get(draft.id).name;
    const beforeComment = state.db.prepare('SELECT name FROM comments WHERE idea_id=?').get(draft.id).name;
    assert.equal(beforeIdea, 'أحمد');
    assert.equal(beforeComment, 'أحمد');

    assert.equal((await setProfile('سعود')).status, 200);
    const data = await read();
    assert.equal(data.ideas[0].name, 'سعود');
    assert.equal(data.ideas[0].comments[0].name, 'سعود');

    assert.equal(state.db.prepare('SELECT name FROM ideas WHERE id=?').get(draft.id).name, 'أحمد');
    assert.equal(state.db.prepare('SELECT name FROM comments WHERE idea_id=?').get(draft.id).name, 'أحمد');
  });

  test('retrying a submission never duplicates it or falsely saves different content', async () => {
    const draft = newIdea();
    assert.equal((await post(draft)).status, 200);
    assert.equal((await post(draft)).status, 200);
    assert.equal((await read()).ideas.length, 1);
    assert.equal((await post({ ...draft, body: 'هذه نسخة مختلفة يجب ألا تضيع بصمت.' })).status, 409);

    state.user = 'bob';
    await setProfile('محمد');
    assert.equal((await post(draft)).status, 409);
    assert.equal((await read()).ideas[0].isOwn, false);
  });

  test('only the author can edit; editing changes content without adding XP', async () => {
    const draft = newIdea();
    await post(draft);

    state.user = 'bob';
    await setProfile('محمد');
    assert.equal((await post({ ...draft, action: 'edit', title: 'تعديل غير مسموح' })).status, 403);

    state.user = 'alice';
    const result = await post({ ...draft, action: 'edit', title: 'الفكرة بعد التطوير', challengeId: 'reverse' });
    assert.equal(result.status, 200);
    assert.equal(result.body.community.ideas[0].title, 'الفكرة بعد التطوير');
    assert.equal(result.body.community.ideas[0].challenge_id, 'queue');
    assert.equal(result.body.community.progress.xp, 20);
    assert.equal((await post({ ...draft, action: 'edit', id: randomUUID() })).status, 404);
  });

  test('another participant can encourage and undo; repeated requests stay idempotent', async () => {
    const draft = newIdea();
    await post(draft);
    const reaction = { action: 'react', ideaId: draft.id, liked: true };
    assert.equal((await post(reaction)).status, 400);

    state.user = 'bob';
    await setProfile('محمد');
    await post(reaction);
    await post(reaction);
    let data = await read();
    assert.equal(data.ideas[0].likes, 1);
    assert.equal(data.ideas[0].liked, true);
    assert.equal(data.progress.xp, 0);

    state.user = 'alice';
    data = await read();
    assert.equal(data.ideas[0].likes, 1);
    assert.equal(data.ideas[0].liked, false);

    state.user = 'bob';
    await post({ ...reaction, liked: false });
    assert.equal((await read()).ideas[0].likes, 0);
  });

  test('discussion persists between users; rewards count distinct other-person ideas', async () => {
    const first = newIdea();
    const second = newIdea();
    const third = newIdea();
    await post(first);
    await post(second);
    await post(third);

    const entry = { action: 'comment', id: randomUUID(), ideaId: first.id, body: 'ماذا لو أضفنا نشاطًا جماعيًا؟' };
    await post(entry);
    assert.equal((await read()).progress.reviews, 0);

    state.user = 'bob';
    await setProfile('محمد');
    entry.id = randomUUID();
    assert.equal((await post(entry)).status, 200);
    await post(entry);
    await post({ ...entry, id: randomUUID(), body: 'اقتراح آخر لنفس الفكرة.' });
    assert.deepEqual((await read()).progress, { ideas: 0, reviews: 1, xp: 5 });
    await post({ ...entry, id: randomUUID(), ideaId: second.id });
    await post({ ...entry, id: randomUUID(), ideaId: third.id });
    assert.deepEqual((await read()).progress, { ideas: 0, reviews: 3, xp: 15 });

    state.user = 'alice';
    const data = await read();
    const discussion = data.ideas.find(idea => idea.id === first.id).comments;
    assert.equal(discussion.length, 3);
    assert.equal(discussion.filter(comment => comment.isOwn).length, 1);
    assert.equal(discussion.filter(comment => comment.name === 'محمد').length, 2);
    assert.ok(!JSON.stringify(data).includes('user_id'));
    assert.ok(!JSON.stringify(data).includes('@example.test'));
  });

  test('comment retries with different content are rejected instead of silently discarded', async () => {
    const draft = newIdea();
    await post(draft);

    state.user = 'bob';
    await setProfile('محمد');
    const entry = { action: 'comment', id: randomUUID(), ideaId: draft.id, body: 'اقتراح للتطوير' };
    await post(entry);
    assert.equal((await post({ ...entry, body: 'اقتراح مختلف تمامًا' })).status, 409);
    assert.equal((await post({ ...entry, id: randomUUID(), ideaId: randomUUID() })).status, 404);
  });

  test('validates inputs and rejects cross-site writes before touching the database', async () => {
    for (const draft of [
      newIdea({ title: ' ' }),
      newIdea({ body: 'short' }),
      newIdea({ id: 'bad-id' }),
      newIdea({ title: 'x'.repeat(101) }),
    ]) assert.equal((await post(draft)).status, 400);

    assert.equal((await post(newIdea({ challengeId: 'missing' }))).status, 404);
    assert.equal((await post('{invalid-json')).status, 400);
    assert.equal((await post('x'.repeat(12001))).status, 413);
    assert.equal((await post(newIdea(), { Origin: 'https://other.example.test' })).status, 403);
    assert.equal((await post(newIdea(), { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await read()).ideas.length, 0);
  });

  test('text is stored literally with prepared statements', async () => {
    const draft = newIdea({ title: "'); DROP TABLE ideas; --", body: '<script>alert("test")</script>' });
    assert.equal((await post(draft)).status, 200);
    assert.equal((await read()).ideas[0].body, draft.body);
  });

  test('a response failure after a write can be retried without a duplicate or extra XP', async () => {
    const draft = newIdea();
    state.failReadAfterWrite = true;
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal((await post(draft)).status, 503);
    } finally {
      console.error = originalError;
    }
    state.failReads = false;
    state.failReadAfterWrite = false;
    assert.equal((await post(draft)).status, 200);
    assert.deepEqual((await read()).progress, { ideas: 1, reviews: 0, xp: 20 });
  });

  test('old owned ideas and their comments remain available beyond the latest 100', async () => {
    const first = newIdea();
    await post(first);
    await post({ action: 'comment', id: randomUUID(), ideaId: first.id, body: 'تعليق على الفكرة القديمة.' });

    const insert = state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?)');
    for (let i = 0; i < 105; i++) {
      insert.run(randomUUID(), 'bob', 'queue', 'محمد', 'فكرة أخرى', 'شرح كاف للفكرة الجديدة.', '2099-01-01T00:00:00.000Z');
    }

    const data = await read();
    assert.equal(data.ideas.length, 101);
    assert.equal(data.ideas.find(idea => idea.id === first.id).comments.length, 1);
  });
});

test('sign-in returns to the precise view and unfinished action', () => {
  const id = randomUUID();
  for (const resume of [
    { view: 'ideas', compose: 'reverse' },
    { view: 'profile', edit: id },
    { view: 'ideas', idea: id },
  ]) {
    const link = new URL(signInHref(resume), 'https://ftc.example.test');
    assert.equal(link.pathname, '/login');
    const destination = new URL(link.searchParams.get('return_to'), link.origin);
    assert.equal(destination.origin, link.origin);
    assert.deepEqual(readResume(destination.search), resume);
  }
  assert.deepEqual(readResume('?view=bad&compose=https://evil.test&idea=bad'), { view: 'home' });
});

test('draft restoration keeps old drafts but ignores their old per-post name field', () => {
  const legacy = { id: randomUUID(), name: 'أحمد', title: 'فكرة', body: 'هذه مسودة محفوظة.' };
  assert.deepEqual(readIdeaDraft(JSON.stringify(legacy)), { id: legacy.id, title: legacy.title, body: legacy.body });
  const draft = { id: randomUUID(), title: 'فكرة', body: 'هذه مسودة محفوظة.' };
  assert.deepEqual(readIdeaDraft(JSON.stringify(draft)), draft);
  for (const raw of [
    null,
    '{broken',
    '{}',
    JSON.stringify({ ...draft, id: 'bad' }),
    JSON.stringify({ ...draft, body: 1 }),
  ]) assert.equal(readIdeaDraft(raw), null);
});
