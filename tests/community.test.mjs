import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { state, resetDatabase } from './community-fixture.mjs';

// Isolated test identities and SQLite; no production headers, account, or database are changed.
registerHooks({ resolve(specifier, context, next) {
  const aliases = {
    '@/lib/auth-server': './community-fixture.mjs',
    '@/lib/database': './community-fixture.mjs',
    '@/lib/challenges': '../lib/challenges.ts',
    '@/lib/profile': '../lib/profile.ts',
    '@/lib/weekly':'../lib/weekly.ts',
    '@/lib/community-read':'../lib/community-read.ts',
    '@/lib/weekly-schema':'../lib/weekly-schema.ts',
    '@/lib/opening':'../lib/opening.ts',
    '@/lib/weekly-opening':'../lib/weekly-opening.ts',
    './weekly-ribbon-policy':'../lib/weekly-ribbon-policy.ts',
    './weekly':'../lib/weekly.ts',
    './weekly-content':'../lib/weekly-content.ts',
    './weekly-db':'../lib/weekly-db.ts',
  };
  if (aliases[specifier]) return { url: new URL(aliases[specifier], import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}, load(url, context, next) {
  if(url.endsWith('.sql?raw'))return {format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true};
  return next(url,context);
} });

const { GET, POST } = await import('../app/api/community/route.ts');
const { readResume, signInHref, readIdeaDraft, clearLegacyDrafts } = await import('../lib/participation.ts');

const newIdea = (extra = {}) => ({
  action: 'idea',
  id: randomUUID(),
  challengeId: 'week-2026-10-14',
  angleId:'change',
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

async function read(query='') {
  return (await GET(new Request('https://ibtkr.space/api/community?'+query))).json();
}

async function setProfile(displayName) {
  return post({ action: 'profile', displayName });
}

describe('Community operations against the real route and SQLite schema', () => {
  beforeEach(async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T12:00:00.000Z') });
    resetDatabase();
    const result = await setProfile('أحمد');
    assert.equal(result.status, 200);
  });

  afterEach(() => mock.timers.reset());
  after(() => state.db?.close());

  test('official launch archives test activity once, clears test XP, and preserves accounts and official activity',async()=>{
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    state.db.prepare('DELETE FROM d1_migrations WHERE name=?').run('0005_launch_week_one.sql');
    const profile=state.db.prepare('SELECT * FROM profiles WHERE user_id=?').get('alice');
    const old=randomUUID(),official=randomUUID(),created='2026-10-12T12:00:00.000Z';
    state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(old,'alice','week-2026-09-30','أحمد','فكرة اختبار','شرح مفصل من الجولة التجريبية.',created,'change');
    state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(official,'bob','week-2026-10-14','محمد','فكرة الإطلاق','شرح مفصل من أسبوع الإطلاق.','2026-10-14T01:00:00.000Z','change');
    for(const id of [old,official]){
      state.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(randomUUID(),id,'bob','محمد','مساهمة لتطوير هذه الفكرة.',created);
      state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'carol',1);
    }
    state.db.prepare('INSERT INTO weekly_results VALUES (?,?,?,?,?,?,?)').run('week-2026-09-30','alice','أحمد',1,1,1,created);
    state.db.prepare('INSERT INTO finalized_weeks VALUES (?,?)').run('week-2026-09-30',created);
    await Promise.all([ensureWeeklySchema(database()),ensureWeeklySchema(database()),ensureWeeklySchema(database())]);
    for(const table of ['ideas','comments','reactions','weekly_results','finalized_weeks']){
      assert.equal(state.db.prepare('SELECT COUNT(*) n FROM launch_test_archive_'+table).get().n,1);
    }
    assert.equal(state.db.prepare('SELECT id FROM ideas').get().id,official);
    for(const table of ['comments','reactions'])assert.equal(state.db.prepare('SELECT idea_id FROM '+table).get().idea_id,official);
    for(const table of ['weekly_results','finalized_weeks'])assert.equal(state.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
    assert.deepEqual(state.db.prepare('SELECT * FROM profiles WHERE user_id=?').get('alice'),profile);
    const data=await read('week=all');assert.deepEqual(data.progress,{ideas:0,reviews:0,xp:0});
    assert.deepEqual(data.weekly.weeks.map(x=>[x.id,x.number]),[['week-2026-10-14','01']]);
    assert.equal(data.ideas.length,1);assert.equal(data.ideas[0].id,official);
    const retired=await read('week=week-2026-09-30');assert.equal(retired.weekly.selected,null);assert.equal(retired.ideas.length,0);
    await ensureWeeklySchema(database());assert.equal(state.db.prepare('SELECT COUNT(*) n FROM launch_test_archive_ideas').get().n,1);
  });

  test('failed launch reset rolls back backups and activity together, then retries without loss',async()=>{
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    state.db.prepare('DELETE FROM d1_migrations WHERE name=?').run('0005_launch_week_one.sql');
    const id=randomUUID();state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(id,'alice','week-2026-09-30','أحمد','فكرة اختبار','شرح مفصل من الجولة التجريبية.','2026-10-12T12:00:00.000Z','change');
    const original=database();let fail=true;
    const db={...original,prepare(sql){
      if(sql.startsWith('INSERT OR IGNORE INTO d1_migrations'))return {bind(name){
        if(fail&&name==='0005_launch_week_one.sql')return {async run(){throw Error('Launch marker unavailable');}};
        return original.prepare(sql).bind(name);
      }};
      return original.prepare(sql);
    }};
    await assert.rejects(ensureWeeklySchema(db),/Launch marker unavailable/);
    assert.equal(state.db.prepare('SELECT id FROM ideas').get().id,id);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM launch_test_archive_ideas').get().n,0);
    fail=false;await ensureWeeklySchema(db);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,0);
    assert.equal(state.db.prepare('SELECT id FROM launch_test_archive_ideas').get().id,id);
  });

  test('GitHub-only release clears old participation and XP without changing an existing profile',async()=>{
    resetDatabase({weekly:false});
    const created='2026-09-22T00:00:00.000Z';
    state.db.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('alice','أحمد','احمد',created,created);
    const profile=state.db.prepare('SELECT * FROM profiles').get();
    for(const challenge of ['queue','reverse','alone']) {
      const id=randomUUID();state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?)').run(id,'alice',challenge,'أحمد','فكرة سابقة','شرح محفوظ من البرنامج السابق.',created);
      state.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(randomUUID(),id,'bob','محمد','مساهمة من البرنامج السابق.',created);
      state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'bob',1);
    }
    const data=await read('week=all');
    assert.equal(data.signedIn,true);assert.deepEqual(data.profile,{displayName:'أحمد'});
    assert.deepEqual(state.db.prepare('SELECT * FROM profiles').get(),profile);
    assert.deepEqual(data.progress,{ideas:0,reviews:0,xp:0});
    assert.equal(data.activityVersion,'official-launch-2026-10-07');
    assert.equal(data.ideas.length,0);assert.equal(data.weekly.ownEntries,0);assert.equal(data.weekly.ownLikes,0);
    for(const table of ['ideas','comments','reactions']) assert.equal(state.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations').get().n,3);
    assert.equal((await post(newIdea())).status,200); // no registration or name setup again
    await read();assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,1);
  });

  test('legacy cleanup preserves new weekly entries, likes, comments, results and profiles across concurrent instances',async()=>{
    resetDatabase();
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    const created='2026-10-15T12:00:00.000Z';
    state.db.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('alice','أحمد','احمد',created,created);
    const old=randomUUID(),weekly=randomUUID();
    for(const [id,challenge,angle] of [[old,'queue',null],[weekly,'week-2026-10-14','change']]) {
      state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(id,'alice',challenge,'أحمد','عنوان فكرة','شرح مفصل للفكرة المقترحة.',created,angle);
      state.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(randomUUID(),id,'bob','محمد','إضافة لتطوير هذه الفكرة.',created);
      state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'bob',1);
      state.db.prepare('INSERT INTO weekly_results VALUES (?,?,?,?,?,?,?)').run(challenge,'alice','أحمد',1,1,1,created);
      state.db.prepare('INSERT INTO finalized_weeks VALUES (?,?)').run(challenge,created);
    }
    await Promise.all([ensureWeeklySchema(database()),ensureWeeklySchema(database()),ensureWeeklySchema(database())]);
    assert.equal(state.db.prepare('SELECT id FROM ideas').get().id,weekly);
    for(const table of ['comments','reactions']) assert.equal(state.db.prepare('SELECT idea_id FROM '+table).get().idea_id,weekly);
    for(const table of ['weekly_results','finalized_weeks']) assert.equal(state.db.prepare('SELECT challenge_id FROM '+table).get().challenge_id,'week-2026-10-14');
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM profiles').get().n,1);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations WHERE name=?').get('0003_clear_legacy_activity.sql').n,1);
    const data=await read('week=all');assert.deepEqual(data.progress,{ideas:1,reviews:0,xp:20});assert.equal(data.ideas[0].likes,1);
    await ensureWeeklySchema(database());assert.equal((await read()).ideas[0].id,weekly);
  });

  test('failed legacy reset rolls back all deletions and retries safely',async()=>{
    resetDatabase();
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    const id=randomUUID(),created='2026-09-22T00:00:00.000Z';
    state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(id,'alice','queue','أحمد','فكرة قديمة','شرح مفصل للفكرة القديمة.',created,null);
    state.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(randomUUID(),id,'bob','محمد','مساهمة سابقة في هذه الفكرة.',created);
    state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'bob',1);
    const original=database();let fail=true;
    const db={...original,prepare(sql){
      if(sql.startsWith('INSERT OR IGNORE INTO d1_migrations')) return {bind(name){
        if(fail && name==='0003_clear_legacy_activity.sql') return {async run(){throw Error('Simulated reset marker failure');}};
        return original.prepare(sql).bind(name);
      }};
      return original.prepare(sql);
    }};
    await assert.rejects(ensureWeeklySchema(db),/reset marker failure/);
    for(const table of ['ideas','comments','reactions'])assert.equal(state.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,1);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations WHERE name=?').get('0003_clear_legacy_activity.sql').n,0);
    fail=false;await ensureWeeklySchema(db);
    for(const table of ['ideas','comments','reactions'])assert.equal(state.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations WHERE name=?').get('0003_clear_legacy_activity.sql').n,1);
  });

  test('a failed automatic upgrade rolls back the schema and can safely retry',async()=>{
    resetDatabase({weekly:false});
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    const original=database();let fail=true;
    const db={...original,prepare(sql){
      if(fail && sql.startsWith('INSERT OR IGNORE INTO d1_migrations'))return {bind(){return {async run(){throw Error('Simulated migration recording failure');}}}};
      return original.prepare(sql);
    }};
    await assert.rejects(ensureWeeklySchema(db),/recording failure/);
    assert.ok(!state.db.prepare('PRAGMA table_info(ideas)').all().some(row=>row.name==='angle_id'));
    assert.equal(state.db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='weekly_results'").get().n,0);
    fail=false;await ensureWeeklySchema(db);
    assert.ok(state.db.prepare('PRAGMA table_info(ideas)').all().some(row=>row.name==='angle_id'));
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations').get().n,3);
  });

  test('concurrent new Worker instances upgrade once without duplicate columns',async()=>{
    resetDatabase({weekly:false});
    const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');const {database}=await import('./community-fixture.mjs');
    await Promise.all([ensureWeeklySchema(database()),ensureWeeklySchema(database()),ensureWeeklySchema(database())]);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM d1_migrations WHERE name=?').get('0002_weekly_challenges.sql').n,1);
    assert.equal(state.db.prepare('PRAGMA table_info(ideas)').all().filter(row=>row.name==='angle_id').length,1);
  });

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
    await post(newIdea({ angleId: 'reverse' }));
    await post(newIdea({ angleId: 'what-if' }));
    assert.deepEqual((await read()).progress, { ideas: 4, reviews: 0, xp: 20 });
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
    assert.equal((await read('idea='+draft.id)).focusedIdea.comments[0].name, 'سعود');

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
    assert.equal(result.body.community.ideas[0].challenge_id, 'week-2026-10-14');
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
    const discussion = (await read('idea='+first.id)).focusedIdea.comments;
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

  test('pagination reaches beyond 100 entries and discussions load separately', async()=>{
    const first=newIdea();await post(first);
    await post({action:'comment',id:randomUUID(),ideaId:first.id,body:'تعليق على الفكرة القديمة.'});
    const insert=state.db.prepare('INSERT INTO ideas (id,user_id,challenge_id,angle_id,name,title,body,created_at) VALUES (?,?,?,?,?,?,?,?)');
    for(let i=0;i<125;i++)insert.run(randomUUID(),'bob','week-2026-10-14','reverse','محمد','فكرة أخرى','شرح كاف للفكرة الجديدة.','2099-01-01T00:00:00.000Z');
    const seen=new Set();for(let page=1;page<=11;page++){const data=await read('page='+page);assert.ok(data.ideas.length<=12);assert.equal(data.pagination.total,126);for(const idea of data.ideas)seen.add(idea.id);}
    assert.equal(seen.size,126);
    const data=await read('idea='+first.id);assert.equal(data.focusedIdea.comments.length,1);assert.equal(data.focusedIdea.commentCount,1);
    assert.equal((await read('scope=mine')).pagination.total,1);
    assert.equal((await read('angle=reverse')).pagination.total,125);
  });

  test('weekly ranking totals all angles without multiplying entry counts, with ties',async()=>{
    const first=newIdea();const second=newIdea({angleId:'what-if'});await post(first);await post(second);
    state.user='bob';await setProfile('محمد');const bob=newIdea({angleId:'reverse'});await post(bob);
    for(const idea of [first,second])await post({action:'react',ideaId:idea.id,liked:true});
    state.user='alice';await post({action:'react',ideaId:bob.id,liked:true});
    state.user='carol';await setProfile('نورة');await post({action:'react',ideaId:bob.id,liked:true});
    let data=await read();assert.equal(data.weekly.leaders[0].likes,2);assert.equal(data.weekly.leaders[1].likes,2);assert.equal(data.weekly.leaders[0].rank,1);assert.equal(data.weekly.leaders[1].rank,1);
    assert.equal(data.weekly.leaders.find(row=>row.name==='أحمد').entries,2);
    await post({action:'react',ideaId:first.id,liked:true});data=await read();assert.equal(data.weekly.leaders[0].name,'أحمد');assert.equal(data.weekly.leaders[0].likes,3);
    assert.equal((await read('sort=popular')).ideas[0].likes,2);
  });

  test('current-week personal totals stay correct when browsing archives',async()=>{
    const draft=newIdea();await post(draft);
    state.user='bob';await setProfile('محمد');await post({action:'react',ideaId:draft.id,liked:true});
    state.user='alice';
    for(const query of ['week=legacy','week=all']){
      const data=await read(query);assert.equal(data.weekly.ownEntries,1);assert.equal(data.weekly.ownLikes,1);
    }
    mock.timers.setTime(new Date('2026-10-21T12:00:00.000Z').getTime());
    state.databaseNow='2026-10-21T12:00:00.000Z';
    await post(newIdea({challengeId:'week-2026-10-21'}));
    const previous=await read('week=week-2026-10-14');
    assert.equal(previous.weekly.selected.id,'week-2026-10-14');
    assert.equal(previous.weekly.leaders[0].likes,1);
    assert.equal(previous.weekly.ownEntries,1);assert.equal(previous.weekly.ownLikes,0);
  });

  test('database cutoff also blocks writes that started before the deadline',async()=>{
    const draft=newIdea();await post(draft);
    state.databaseNow='2026-10-16T21:00:00.000Z';
    assert.equal((await post(newIdea())).status,409);
    assert.equal((await post({...draft,action:'edit'})).status,409);
    state.user='bob';await setProfile('محمد');
    assert.equal((await post({action:'react',ideaId:draft.id,liked:true})).status,409);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM reactions').get().n,0);
  });

  test('editing angle preserves identity and likes; invalid angles fail',async()=>{
    const draft=newIdea();await post(draft);
    assert.equal((await post(newIdea({angleId:'bad'}))).status,400);
    assert.equal((await post({...draft,action:'edit',angleId:'what-if'})).status,200);
    assert.equal((await read()).ideas[0].angle_id,'what-if');
    assert.equal((await post({...draft,action:'edit',angleId:'bad'})).status,400);
  });

  test('unexpected legacy entries cannot be edited or voted on after the one-time reset',async()=>{
    const id=randomUUID();state.db.prepare('INSERT INTO ideas (id,user_id,challenge_id,name,title,body,created_at) VALUES (?,?,?,?,?,?,?)').run(id,'alice','queue','أحمد','فكرة سابقة','مشاركة محفوظة قبل البرنامج الأسبوعي.','2026-09-22T00:00:00.000Z');
    assert.equal((await post({action:'edit',id,angleId:'change',title:'عنوان جديد',body:'شرح كاف للفكرة الجديدة.'})).status,409);
    state.user='bob';await setProfile('محمد');assert.equal((await post({action:'react',ideaId:id,liked:true})).status,409);
    assert.equal((await read('week=legacy')).ideas[0].id,id);assert.equal((await read()).ideas.length,0);
  });

  test('Saturday midnight cutoff rejects new entries, edits and all vote changes',async()=>{
    const {weeklyChallenges}=await import('../lib/weekly.ts');const week=weeklyChallenges[0];
    mock.timers.setTime(Date.parse(week.endsAt)-1);state.databaseNow=new Date(Date.now()).toISOString();
    const draft=newIdea();assert.equal((await post(draft)).status,200);
    assert.equal((await post({...draft,action:'edit'})).status,200);
    state.user='bob';await setProfile('محمد');
    assert.equal((await post({action:'react',ideaId:draft.id,liked:true})).status,200);
    mock.timers.setTime(Date.parse(week.endsAt));state.databaseNow=week.endsAt;
    state.user='alice';
    assert.equal((await post(newIdea())).status,409);
    assert.equal((await post({...draft,action:'edit'})).status,409);
    state.user='bob';
    assert.equal((await post({action:'react',ideaId:draft.id,liked:true})).status,409);
    assert.equal((await post({action:'react',ideaId:draft.id,liked:false})).status,409);
    const data=await read('week='+week.id);
    assert.equal(data.weekly.current.id,weeklyChallenges[1].id);assert.equal(data.weekly.finalized,true);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM reactions WHERE liked=1').get().n,1);
  });

  test('date boundaries are Saturday 00:00 Riyadh and next published week replaces the old one',async()=>{
    const {currentChallenge,weeklyChallenges,challengeStatus}=await import('../lib/weekly.ts');const first=weeklyChallenges[0];
    assert.equal(currentChallenge(new Date('2026-10-16T20:59:59.999Z')).id,first.id);
    assert.equal(currentChallenge(new Date('2026-10-16T21:00:00.000Z')).id,'week-2026-10-21');
    assert.equal(challengeStatus(first,new Date(first.endsAt)),'closed');
  });

  test('week two uses the approved try-before-buy challenge without changing week one or the rollover',async()=>{
    const {currentChallenge,weeklyChallenges}=await import('../lib/weekly.ts');
    assert.equal(weeklyChallenges[0].title,'إلغاء الاشتراك… بدون دوّامة.');
    const next=currentChallenge(new Date('2026-10-16T21:00:00.000Z'));
    assert.equal(next.id,'week-2026-10-21');
    assert.equal(next.title,'جرّبها… قبل ما تشتريها.');
    assert.equal(next.endsAt,'2026-10-23T21:00:00.000Z');
    assert.deepEqual(next.angles.map(angle=>angle.prompt),[
      'كيف تخلي تجربة المنتج تبدأ قبل الدفع؟',
      'بدل ما الشخص يبحث عن منتج يناسبه، كيف تخلي المنتج يثبت إنه مناسب له؟',
      'ماذا لو عندك دقيقة واحدة فقط عشان تساعده يعرف هل المنتج يناسبه؟',
    ]);
    assert.ok(next.angles.every(angle=>angle.hint.trim()));
  });

  test('twenty official launch weeks are contiguous and each boundary selects exactly its next challenge',async()=>{
    const {currentChallenge,weeklyChallenges,validateSchedule}=await import('../lib/weekly.ts');
    validateSchedule();assert.equal(weeklyChallenges.length,20);
    assert.equal(weeklyChallenges[1].startsAt,'2026-10-16T21:00:00.000Z');
    assert.equal(weeklyChallenges.at(-1).endsAt,'2027-02-26T21:00:00.000Z');
    const titles=new Set(),prompts=new Set();
    for(let i=0;i<weeklyChallenges.length;i++){
      const week=weeklyChallenges[i];
      const end=new Date(week.endsAt),start=new Date(week.startsAt);
      assert.equal(end.getUTCDay(),5);assert.equal(end.getUTCHours(),21);
      assert.equal(end.getTime()-start.getTime(),7*86400000);
      assert.equal(start.getUTCDay(),5);
      // Old IDs remain valid, even though their start dates have moved.
      assert.equal(week.id,'week-'+new Date(Date.parse('2026-10-13T21:00:00.000Z')+i*7*86400000+3*3600000).toISOString().slice(0,10));
      titles.add(week.title);assert.equal(week.number,String(i+1).padStart(2,'0'));
      assert.equal(currentChallenge(new Date(week.startsAt))?.id,week.id);
      assert.equal(currentChallenge(new Date(Date.parse(week.endsAt)-1))?.id,week.id);
      assert.equal(currentChallenge(new Date(week.endsAt))?.id,weeklyChallenges[i+1]?.id);
      assert.deepEqual(week.angles.map(x=>x.id),['change','reverse','what-if']);
      for(const angle of week.angles){prompts.add(angle.prompt);assert.ok(angle.hint.length>20);}
    }
    assert.equal(titles.size,20);assert.equal(prompts.size,60);
    assert.equal(currentChallenge(new Date('2027-02-26T21:00:00.000Z')),null);
  });

  test('rollover freezes the old score, starts a clean current leaderboard and retains archives and lifetime XP',async()=>{
    const draft=newIdea();assert.equal((await post(draft)).status,200);
    state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(draft.id,'bob',1);
    mock.timers.tick(Date.parse('2026-10-16T21:00:00.000Z')-Date.now());
    state.databaseNow='2026-10-16T21:00:00.000Z';
    const current=await read();
    assert.equal(current.weekly.current.id,'week-2026-10-21');
    assert.equal(current.weekly.current.number,'02');
    assert.deepEqual(current.weekly.weeks.map(x=>x.id),['week-2026-10-21','week-2026-10-14']);
    assert.equal(current.weekly.ownEntries,0);assert.equal(current.weekly.ownLikes,0);
    assert.equal(current.weekly.leaderTotal,0);assert.equal(current.ideas.length,0);assert.equal(current.progress.xp,20);
    const archive=await read('week=week-2026-10-14');
    assert.equal(archive.weekly.finalized,true);assert.equal(archive.weekly.leaders[0].likes,1);
    assert.equal(archive.ideas[0].id,draft.id);
    assert.equal((await post({...draft,action:'edit'})).status,409);
    state.user='bob';await setProfile('محمد');
    assert.equal((await post({action:'react',ideaId:draft.id,liked:false})).status,409);
    state.user='alice';
    assert.equal((await post(newIdea({challengeId:'week-2026-10-21'}))).status,200);
    assert.equal((await read()).weekly.ownEntries,1);
    assert.equal((await read('week=week-2026-10-14')).weekly.leaders[0].likes,1);
  });

  test('search treats wildcard input literally and matches authors',async()=>{
    await post(newIdea({title:'فكرة 100%'}));await post(newIdea({title:'عنوان مختلف'}));
    assert.equal((await read('q='+encodeURIComponent('%'))).pagination.total,1);
    assert.equal((await read('q='+encodeURIComponent('أحمد'))).pagination.total,2);
    assert.equal((await read('q='+encodeURIComponent("' OR 1=1 --"))).pagination.total,0);
  });

  test('140 participants, paged rankings and long discussions remain bounded and complete',async()=>{
    const insert=state.db.prepare('INSERT INTO ideas (id,user_id,challenge_id,angle_id,name,title,body,created_at) VALUES (?,?,?,?,?,?,?,?)');
    let target;
    for(let i=0;i<140;i++){const id=randomUUID();target??=id;insert.run(id,'participant-'+i,'week-2026-10-14','change','عضو '+i,'فكرة '+i,'شرح مفصل للحل المقترح.','2026-10-08T00:00:00.000Z');}
    for(let i=0;i<55;i++)state.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?,?)').run(randomUUID(),target,'alice','أحمد','تعليق مختلف لتطوير الفكرة.','2026-10-08T00:00:00.000Z');
    const first=await read('idea='+target);assert.equal(first.weekly.leaderTotal,140);assert.equal(first.weekly.leaders.length,20);assert.equal(first.focusedIdea.comments.length,20);assert.equal(first.discussion.pages,3);
    const names=new Set();for(let page=1;page<=7;page++){const data=await read('leaderPage='+page);for(const entry of data.weekly.leaders)names.add(entry.name);}
    assert.equal(names.size,140);
    const last=await read('idea='+target+'&commentPage=3');assert.equal(last.focusedIdea.comments.length,15);
    const plans=state.db.prepare('EXPLAIN QUERY PLAN SELECT * FROM ideas WHERE challenge_id=? ORDER BY created_at DESC,id DESC LIMIT 12').all('week-2026-10-14');assert.ok(plans.some(row=>row.detail.includes('idx_ideas_week_created')));
  });

  test('finalization is atomic, repeat-safe, and preserves snapshots',async()=>{
    const {finalizeClosedWeeks}=await import('../lib/weekly-db.ts');const {database}=await import('./community-fixture.mjs');
    const draft=newIdea();await post(draft);state.user='bob';await setProfile('محمد');await post({action:'react',ideaId:draft.id,liked:true});
    const afterClose=new Date('2026-10-21T00:00:00.000Z');await finalizeClosedWeeks(database(),afterClose);await finalizeClosedWeeks(database(),afterClose);
    const rows=state.db.prepare('SELECT * FROM weekly_results').all();assert.equal(rows.length,1);assert.equal(rows[0].likes,1);assert.equal(rows[0].rank,1);
    state.db.prepare('UPDATE reactions SET liked=0').run();await finalizeClosedWeeks(database(),afterClose);assert.equal(state.db.prepare('SELECT likes FROM weekly_results').get().likes,1);
    assert.equal((await read()).weekly.finalized,true);
  });

});

test('sign-in returns to the precise view and unfinished action', () => {
  const id = randomUUID();
  for (const resume of [
    { view: 'ideas', compose: 'week-2026-10-14',angle:'reverse' },
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


test('launch browser cleanup removes test and legacy drafts while preserving auth and official drafts',()=>{
  const values=new Map([
    ['ftc-draft-queue','old'],['ftc-draft-reverse','old'],['ftc-draft-alone','old'],
    ['ftc-draft-week-2026-09-30-change',JSON.stringify({title:'test'})],
    ['ftc-draft-week-2026-09-30','old-test'],
    ['ftc-draft-week-2026-10-14-change',JSON.stringify({legacyKey:'ftc-draft-queue'})],
    ['ftc-draft-week-2026-10-14-reverse',JSON.stringify({title:'new'})],
    ['sb-existing-auth-token','existing-session'],['ftc-theme','dark'],['unrelated','keep'],
  ]);
  clearLegacyDrafts({get length(){return values.size;},key(i){return [...values.keys()][i]??null;},getItem(key){return values.get(key)??null;},removeItem(key){values.delete(key);}});
  assert.deepEqual([...values.keys()],['ftc-draft-week-2026-10-14-reverse','sb-existing-auth-token','ftc-theme','unrelated']);
  assert.doesNotThrow(()=>clearLegacyDrafts({get length(){throw Error('Storage unavailable');}}));
});
