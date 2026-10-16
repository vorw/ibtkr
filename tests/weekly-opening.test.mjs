import assert from 'node:assert/strict';
import {test,beforeEach,afterEach,after,mock} from 'node:test';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {state,resetDatabase,database} from './community-fixture.mjs';
registerHooks({resolve(s,c,next){
  const a={'@/lib/database':'./community-fixture.mjs','@/lib/auth-server':'./community-fixture.mjs','@/lib/opening':'../lib/opening.ts','@/lib/weekly':'../lib/weekly.ts','@/lib/weekly-opening':'../lib/weekly-opening.ts','@/lib/challenges':'../lib/challenges.ts','@/lib/profile':'../lib/profile.ts','@/lib/community-read':'../lib/community-read.ts','@/lib/weekly-schema':'../lib/weekly-schema.ts','./weekly-ribbon-policy':'../lib/weekly-ribbon-policy.ts','./weekly':'../lib/weekly.ts','./weekly-content':'../lib/weekly-content.ts','./weekly-db':'../lib/weekly-db.ts'};
  return a[s]?{url:new URL(a[s],import.meta.url).href,shortCircuit:true}:next(s,c);
},load(url,c,next){return url.endsWith('.sql?raw')?{format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true}:next(url,c);}});
const {weeklyChallenges}=await import('../lib/weekly.ts');
const {readWeeklyOpening,weeklyVisitor,cutWeeklyOpening}=await import('../lib/weekly-opening.ts');
const api=await import('../app/api/weekly-opening/route.ts');
const community=await import('../app/api/community/route.ts');
const week=weeklyChallenges[1];
beforeEach(()=>{resetDatabase({ribbonOpened:false});mock.timers.enable({apis:['Date'],now:new Date(week.startsAt)});state.databaseNow=week.startsAt;state.user=null;});
afterEach(()=>mock.timers.reset());after(()=>state.db?.close());
const url='https://ibtkr.space/api/weekly-opening?week='+week.id;
test('guest cookie is private, repeat cuts count once, and a new week gets a fresh counter',async()=>{
  const response=await api.GET(new Request(url));assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  const cut=()=>api.POST(new Request(url,{method:'POST',headers:{Origin:'https://ibtkr.space',Cookie:cookie},body:JSON.stringify({action:'cut'})}));
  assert.equal((await (await cut()).json()).count,1);assert.equal((await (await cut()).json()).count,1);
  const db=database();assert.equal((await readWeeklyOpening(db,weeklyChallenges[2])).count,0);
  assert.equal(await weeklyVisitor(db,weeklyChallenges[2],cookie.split('=')[1]),null);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM profiles').get().n,0);
});
test('forty concurrent visitors open exactly at ten; later arrivals remain open without contributing',async()=>{
  const db=database();const ids=await Promise.all(Array.from({length:40},()=>weeklyVisitor(db,week,null,true)));
  await Promise.all(ids.map(id=>cutWeeklyOpening(db,week,id)));
  const result=await readWeeklyOpening(db,week);assert.equal(result.count,10);assert.equal(result.isOpen,true);
  const response=await api.GET(new Request(url));assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts WHERE event_id=?').get(result.eventId).n,10);
});
test('leaderboard and profiles stay accessible while question details and submissions wait for ten cuts',async()=>{
  const response=await community.GET(new Request('https://ibtkr.space/api/community'));assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.weekly.current.id,week.id);assert.equal(result.weekly.current.description,'');assert.deepEqual(result.weekly.current.angles,[]);
  assert.equal(result.weekly.weeks.find(w=>w.number==='01').title,'إلغاء الاشتراك… بدون دوّامة.');
  state.user='alice';const req=body=>new Request('https://ibtkr.space/api/community',{method:'POST',headers:{Origin:'https://ibtkr.space'},body:JSON.stringify(body)});
  assert.equal((await community.POST(req({action:'profile',displayName:'سالم'}))).status,200);
  assert.equal((await community.POST(req({action:'idea',id:crypto.randomUUID(),challengeId:week.id,angleId:'change',title:'فكرة',body:'وصف فكرة كامل للتجربة الجديدة.'}))).status,423);
  const db=database();for(let i=0;i<10;i++)await cutWeeklyOpening(db,week,await weeklyVisitor(db,week,null,true));
  const opened=await (await community.GET(new Request('https://ibtkr.space/api/community'))).json();assert.equal(opened.weekly.current.title,week.title);assert.equal(opened.weekly.current.angles.length,3);
});
test('old week requests and cross-site cuts cannot affect the current ribbon',async()=>{
  assert.equal((await api.GET(new Request(url.replace(week.id,weeklyChallenges[0].id)))).status,409);
  assert.equal((await api.POST(new Request(url,{method:'POST',headers:{Origin:'https://evil.test'},body:'{"action":"cut"}'}))).status,403);
  assert.equal((await readWeeklyOpening(database(),weeklyChallenges[0])).isOpen,true);
  assert.equal((await readWeeklyOpening(database(),week)).count,0);
});
