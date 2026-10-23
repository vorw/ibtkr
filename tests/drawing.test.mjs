import assert from 'node:assert/strict';
import {test,beforeEach,afterEach,after,mock} from 'node:test';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {state,resetDatabase,database} from './community-fixture.mjs';
import {jpeg} from './drawing-fixture.mjs';
registerHooks({resolve(s,c,next){const p={'@/lib/database':'./community-fixture.mjs','@/lib/auth-server':'./community-fixture.mjs','@/lib/opening':'../lib/opening.ts','@/lib/weekly':'../lib/weekly.ts','@/lib/weekly-opening':'../lib/weekly-opening.ts','@/lib/challenges':'../lib/challenges.ts','@/lib/profile':'../lib/profile.ts','@/lib/community-read':'../lib/community-read.ts','@/lib/weekly-schema':'../lib/weekly-schema.ts','@/lib/drawings':'../lib/drawings.ts','@/lib/drawing-policy':'../lib/drawing-policy.ts','./drawings':'../lib/drawings.ts','./weekly-ribbon-policy':'../lib/weekly-ribbon-policy.ts','./weekly':'../lib/weekly.ts','./weekly-content':'../lib/weekly-content.ts','./weekly-db':'../lib/weekly-db.ts'};return p[s]?{url:new URL(p[s],import.meta.url).href,shortCircuit:true}:next(s,c);},load(url,c,next){return url.endsWith('.sql?raw')?{format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true}:next(url,c);}});
const community=await import('../app/api/community/route.ts');
const image=await import('../app/api/drawing/route.ts');
const {weeklyChallenges,angleLabel}=await import('../lib/weekly.ts');
const {validDrawing}=await import('../lib/drawing-policy.ts');
const {readIdeaDraft}=await import('../lib/participation.ts');
const week=weeklyChallenges[2];
async function post(body){const response=await community.POST(new Request('https://ibtkr.space/api/community',{method:'POST',headers:{Origin:'https://ibtkr.space'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}
const entry=(extra={})=>({action:'idea',id:randomUUID(),challengeId:week.id,angleId:'change',title:'غطاء ذكي',body:'غطاء يمنع الانسكاب.',drawing:jpeg,...extra});
beforeEach(async()=>{
  resetDatabase();mock.timers.enable({apis:['Date'],now:new Date(week.startsAt)});state.databaseNow=week.startsAt;
  state.db.prepare('INSERT INTO opening_events VALUES (?,?,?)').run('ibtkr-weekly-ribbon-'+week.id,20,week.startsAt);
  assert.equal((await post({action:'profile',displayName:'سالم'})).status,200);
});
afterEach(()=>mock.timers.reset());after(()=>state.db?.close());
test('drawing round replaces only week 03, keeps dates, unique tracks and the usual leaderboard',()=>{
  assert.equal(week.number,'03');assert.equal(week.startsAt,'2026-10-23T21:00:00.000Z');assert.equal(week.endsAt,'2026-10-30T21:00:00.000Z');assert.equal(week.submission,'drawing');
  assert.equal(week.title,'لمبة ولعت… فهمتها؟');assert.equal(week.drawingTheme,'warning-symbols');
  assert.deepEqual(week.angles.map(a=>a.id),['change','reverse','what-if']);
  assert.deepEqual(week.angles.map(a=>a.label),['تحذير الفرامل','ضغط الإطارات','فحص المحرك']);assert.equal(angleLabel('change',week.id),'تحذير الفرامل');
  assert.equal(weeklyChallenges[1].title,'جرّبها… قبل ما تشتريها.');assert.equal(weeklyChallenges[1].submission,undefined);assert.equal(weeklyChallenges[3].submission,undefined);
});
test('raster validation rejects SVG, spoofed data, oversized bytes and oversized dimensions',()=>{
  assert.equal(validDrawing(jpeg),true);
  for(const data of ['', 'https://example.test/a.jpg','data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,'+btoa('<script>alert(1)</script>'),jpeg+'AAAA',jpeg.slice(0,-4),'data:image/jpeg;base64,'+'A'.repeat(240004)])assert.equal(validDrawing(data),false);
  const raw=Buffer.from(jpeg.slice(23),'base64'),frame=raw.indexOf(Buffer.from([255,192]));raw.writeUInt16BE(5000,frame+7);assert.equal(validDrawing('data:image/jpeg;base64,'+raw.toString('base64')),false);
});
test('a drawing and caption save atomically, retry once, and images never bulk-load in the community response',async()=>{
  const value=entry(),first=await post(value);assert.equal(first.status,200);const saved=first.body.community.focusedIdea;
  assert.match(saved.drawingRevision,/^[a-f0-9]{64}$/);assert.equal(saved.body,value.body);assert.equal(JSON.stringify(first.body).includes('base64'),false);
  assert.equal((await post(value)).status,200);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,1);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM idea_drawings').get().n,1);
  const different=Buffer.from(jpeg.slice(23),'base64');different[25]=9;
  assert.equal((await post({...value,drawing:'data:image/jpeg;base64,'+different.toString('base64')})).status,409);
});
test('attachments require verified community sign-in and are served as private non-executable JPEGs',async()=>{
  const value=entry();assert.equal((await post(value)).status,200);const req=()=>new Request('https://ibtkr.space/api/drawing?id='+value.id);
  state.user=null;assert.equal((await image.GET(req())).status,401);state.user='bob';
  const response=await image.GET(req());assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('vary'),'Authorization');
  assert.equal(Buffer.from(await response.arrayBuffer()).toString('base64'),jpeg.slice(23));
  assert.equal((await image.GET(new Request('https://ibtkr.space/api/drawing?id='+randomUUID()))).status,404);
});
test('missing pictures, long captions and invalid pictures cannot create half an entry',async()=>{
  for(const value of [entry({drawing:undefined}),entry({drawing:'data:image/svg+xml;base64,PHN2Zz4='}),entry({body:'x'.repeat(181)})])assert.equal((await post(value)).status,400);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,0);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM idea_drawings').get().n,0);
});
test('only the owner can edit a drawing; closed weeks cannot alter pictures or captions',async()=>{
  const value=entry();await post(value);state.user='bob';await post({action:'profile',displayName:'محمد'});
  assert.equal((await post({...value,action:'edit',body:'نسخة غير مسموحة.'})).status,403);state.user='alice';
  assert.equal((await post({...value,action:'edit',body:'غطاء يثبت بلفة واحدة.'})).status,200);
  mock.timers.tick(7*86400000);state.databaseNow=week.endsAt;
  state.db.prepare('INSERT INTO opening_events VALUES (?,?,?)').run('ibtkr-weekly-ribbon-'+weeklyChallenges[3].id,20,week.endsAt);
  assert.equal((await post({...value,action:'edit',body:'تعديل بعد الموعد.'})).status,409);
  assert.equal(state.db.prepare('SELECT body FROM ideas WHERE id=?').get(value.id).body,'غطاء يثبت بلفة واحدة.');
});
test('database deadline and ribbon still guard drawing submissions',async()=>{
  state.databaseNow=week.endsAt;assert.equal((await post(entry())).status,409);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM idea_drawings').get().n,0);
  state.databaseNow=week.startsAt;state.db.prepare('UPDATE opening_events SET opened_at=NULL WHERE id=?').run('ibtkr-weekly-ribbon-'+week.id);
  assert.equal((await post(entry())).status,423);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,0);
});
test('image write failure rolls back its entry as one transaction',async()=>{
  state.db.exec("CREATE TRIGGER reject_drawing BEFORE INSERT ON idea_drawings BEGIN SELECT RAISE(ABORT,'simulated image failure'); END");
  assert.equal((await post(entry())).status,503);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM ideas').get().n,0);
});
test('a batch crossing midnight keeps the accepted caption and image together',async()=>{
  let calls=0;state.db.function('test_now',()=>++calls<=2?week.startsAt:week.endsAt);
  const value=entry();assert.equal((await post(value)).status,200);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM idea_drawings').get().n,1);
  calls=0;state.db.function('test_now',()=>++calls===1?week.startsAt:week.endsAt);
  const different=Buffer.from(jpeg.slice(23),'base64');different[25]=9;const drawing='data:image/jpeg;base64,'+different.toString('base64');
  assert.equal((await post({...value,action:'edit',body:'تعديل عند آخر لحظة.',drawing})).status,200);
  assert.equal(state.db.prepare('SELECT image_data FROM idea_drawings WHERE idea_id=?').get(value.id).image_data,drawing);
});
test('drawing drafts recover without accepting external URLs',()=>{
  const draft={id:randomUUID(),title:'رسمة',body:'فكرتي',angleId:'change',drawing:jpeg};assert.equal(readIdeaDraft(JSON.stringify(draft)).drawing,jpeg);
  assert.equal(readIdeaDraft(JSON.stringify({...draft,drawing:'https://bad.test/picture.svg'})).drawing,undefined);
});
