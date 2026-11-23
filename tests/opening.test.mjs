import assert from 'node:assert/strict';
import { test,beforeEach,afterEach,after,mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { state,resetDatabase,database } from './community-fixture.mjs';
registerHooks({resolve(s,c,next){const paths={'@/lib/drawings':'../lib/drawings.ts','@/lib/drawing-policy':'../lib/drawing-policy.ts','./drawings':'../lib/drawings.ts'};return paths[s]?{url:new URL(paths[s],import.meta.url).href,shortCircuit:true}:next(s,c);}});
registerHooks({resolve(s,c,next){
  const aliases={'@/lib/auth-server':'./community-fixture.mjs','@/lib/database':'./community-fixture.mjs',
    '@/lib/weekly-opening':'../lib/weekly-opening.ts','./weekly-ribbon-policy':'../lib/weekly-ribbon-policy.ts',
    '@/lib/opening':'../lib/opening.ts','@/lib/challenges':'../lib/challenges.ts','@/lib/profile':'../lib/profile.ts',
    '@/lib/community-read':'../lib/community-read.ts','@/lib/weekly-schema':'../lib/weekly-schema.ts','@/lib/weekly':'../lib/weekly.ts',
    './weekly':'../lib/weekly.ts','./weekly-content':'../lib/weekly-content.ts','./weekly-db':'../lib/weekly-db.ts'};
  if(aliases[s])return {url:new URL(aliases[s],import.meta.url).href,shortCircuit:true};return next(s,c);
},load(url,c,next){
  if(url.endsWith('.sql?raw'))return {format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true};return next(url,c);
}});
const {readOpening,cutOpening,openingConfig,createOpeningVisitor,resolveOpeningVisitor}=await import('../lib/opening.ts');
const {GET,POST}=await import('../app/api/opening/route.ts');
const community=await import('../app/api/community/route.ts');
const originalConfig={...openingConfig};
beforeEach(()=>{Object.assign(openingConfig,originalConfig);resetDatabase({opened:false});mock.timers.enable({apis:['Date'],now:new Date('2026-10-14T12:00:00.000Z')});});
afterEach(()=>{mock.timers.reset();Object.assign(openingConfig,originalConfig);});after(()=>state.db?.close());
const request=(cookie,body={action:'cut'},headers={})=>new Request('https://ibtkr.space/api/opening',{method:'POST',headers:{Origin:'https://ibtkr.space','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},body:typeof body==='string'?body:JSON.stringify(body)});
async function visit(cookie){
  const response=await GET(new Request('https://ibtkr.space/api/opening',{headers:cookie?{Cookie:cookie}:{}}));
  return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]??cookie,data:await response.json()};
}
const visitors=async(db,n)=>Promise.all(Array.from({length:n},()=>createOpeningVisitor(db)));

test('anonymous visits get a secure server-issued cookie and reveal no participant identity',async()=>{
  state.user=null;const {response,cookie,data}=await visit();assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=2592000'])assert.ok(response.headers.get('set-cookie').includes(flag));
  assert.deepEqual(data,{eventId:openingConfig.id,target:10,count:0,isOpen:false,canCut:true,hasCut:false,position:null,openedAt:null});
  assert.ok(cookie.startsWith('__Host-ibtkr-opening='));assert.equal(JSON.stringify(data).includes(cookie.split('=')[1]),false);
  const repeat=await visit(cookie);assert.equal(repeat.response.headers.get('set-cookie'),null);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_visitors').get().n,1);
});
test('guests can cut without login; retries, refreshes and a later login keep one contribution',async()=>{
  state.user=null;const {cookie}=await visit();const first=await POST(request(cookie));assert.equal(first.status,200);
  const data=await first.json();assert.equal(data.count,1);assert.equal(data.position,1);assert.equal(data.canCut,false);
  assert.equal((await (await POST(request(cookie))).json()).count,1);state.user='alice';
  assert.equal((await (await POST(request(cookie))).json()).count,1);
  const refreshed=(await visit(cookie)).data;assert.equal(refreshed.hasCut,true);assert.equal(refreshed.position,1);assert.equal(refreshed.count,1);
});
test('the tenth visitor opens once, with stable private order even when timestamps tie',async()=>{
  const db=database(),ids=await visitors(db,11);
  for(let i=0;i<10;i++){const s=await cutOpening(db,ids[i]);assert.equal(s.count,i+1);assert.equal(s.position,i+1);assert.equal(s.isOpen,i===9);}
  const timestamp=(await readOpening(db,null)).openedAt;mock.timers.tick(60000);
  const later=await cutOpening(db,ids[10]);assert.equal(later.count,10);assert.equal(later.hasCut,false);assert.equal(later.position,null);assert.equal(later.openedAt,timestamp);
  assert.equal((await cutOpening(db,ids[0])).position,1);assert.equal((await readOpening(db,null)).isOpen,true);
  assert.equal(state.db.prepare('SELECT COUNT(DISTINCT cut_at) n FROM opening_cuts').get().n,1);
});
test('forty simultaneous cuts stop at ten and assign each accepted visitor a distinct order',async()=>{
  const db=database(),ids=await visitors(db,40);const results=await Promise.all(ids.map(id=>cutOpening(db,id)));
  assert.ok(results.every(r=>r.count<=10));assert.equal((await readOpening(db,null)).count,10);
  const accepted=results.filter(r=>r.hasCut);assert.equal(accepted.length,10);
  assert.deepEqual(accepted.map(r=>r.position).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i+1));
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts').get().n,10);
});
test('missing or forged cookies and spoofed account headers cannot invent a participant',async()=>{
  state.user=null;assert.equal((await POST(request(null))).status,409);
  assert.equal((await POST(request('__Host-ibtkr-opening='+crypto.randomUUID()))).status,409);
  assert.equal((await POST(request(null,{action:'cut'},{'oai-authenticated-user-id':'victim',Authorization:'Bearer forged'}))).status,409);
  const {cookie}=await visit();assert.equal((await POST(request(cookie,{action:'cut',userId:'bob'}))).status,400);
  assert.equal((await readOpening(database(),null)).count,0);await assert.rejects(cutOpening(database(),'forged'),/not initialized/);
});
test('cross-site, malformed and oversized requests never count',async()=>{
  const {cookie}=await visit();
  for(const headers of [{Origin:'https://evil.test'},{'sec-fetch-site':'cross-site'}])assert.equal((await POST(request(cookie,{action:'cut'},headers))).status,403);
  for(const body of ['{broken','x'.repeat(1001),{action:'reset'},{action:'cut',count:10}])assert.equal((await POST(request(cookie,body))).status,400);
  assert.equal((await readOpening(database(),null)).count,0);
});
test('new browsers get distinct visitor tokens without creating account profiles or recording contact information',async()=>{
  state.user=null;const a=await visit(),b=await visit();assert.notEqual(a.cookie,b.cookie);
  assert.equal((await (await POST(request(a.cookie))).json()).position,1);
  assert.equal((await (await POST(request(b.cookie))).json()).position,2);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM profiles').get().n,0);
  assert.deepEqual(state.db.prepare('PRAGMA table_info(opening_visitors)').all().map(c=>c.name),['id','event_id','created_at']);
});
test('community stays closed through nine cuts then opens without changing week 01 or email eligibility',async()=>{
  const db=database(),ids=await visitors(db,10);
  const read=()=>community.GET(new Request('https://ibtkr.space/api/community'));
  const write=()=>community.POST(new Request('https://ibtkr.space/api/community',{method:'POST',headers:{Origin:'https://ibtkr.space','Content-Type':'application/json'},body:JSON.stringify({action:'profile',displayName:'أحمد'})}));
  assert.equal((await read()).status,423);assert.equal((await write()).status,423);
  for(let i=0;i<9;i++)await cutOpening(db,ids[i]);assert.equal((await read()).status,423);
  await cutOpening(db,ids[9]);const opened=await read();assert.equal(opened.status,200);
  const data=await opened.json();assert.equal(data.weekly.current.id,'week-2026-10-14');assert.equal(data.weekly.current.number,'01');
  assert.equal((await write()).status,200);assert.deepEqual(data.progress,{ideas:0,reviews:0,xp:0});
});
test('a failed tenth-cut transaction rolls back both the count and opening and retries safely',async()=>{
  const db=database(),ids=await visitors(db,10);for(let i=0;i<9;i++)await cutOpening(db,ids[i]);let fail=true;
  const broken={...db,prepare(sql){
    if(sql.startsWith('UPDATE opening_events'))return {bind(...values){return {async run(){if(fail)throw Error('Simulated opening write failure');return db.prepare(sql).bind(...values).run();}};}};
    return db.prepare(sql);
  }};
  await assert.rejects(cutOpening(broken,ids[9]),/Simulated opening write failure/);
  const closed=await readOpening(db,ids[9]);assert.equal(closed.count,9);assert.equal(closed.hasCut,false);assert.equal(closed.isOpen,false);
  fail=false;assert.equal((await cutOpening(broken,ids[9])).position,10);assert.equal((await readOpening(db,null)).isOpen,true);
});
test('a fresh event retains older contributions and prevents their visitor cookies carrying over',async()=>{
  const original=openingConfig.id,db=database(),id=await createOpeningVisitor(db);await cutOpening(db,id);
  openingConfig.id='future-event';const nextDb=database();assert.equal(await resolveOpeningVisitor(nextDb,id),null);
  const next=await readOpening(nextDb,null);assert.equal(next.count,0);assert.equal(next.isOpen,false);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts WHERE event_id=?').get(original).n,1);
});
test('after opening, new arrivals do not create more visitor records or receive another ceremony',async()=>{
  const db=database(),ids=await visitors(db,10);for(const id of ids)await cutOpening(db,id);
  const result=await visit();assert.equal(result.data.isOpen,true);assert.equal(result.data.canCut,false);assert.equal(result.response.headers.get('set-cookie'),null);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_visitors').get().n,10);
});
test('disabling the gate preserves visitor and cut records',async()=>{
  const db=database(),id=await createOpeningVisitor(db);await cutOpening(db,id);openingConfig.enabled=false;
  assert.equal((await readOpening(db,null)).isOpen,true);assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts').get().n,1);
});

test('old preview query strings cannot bypass a closed launch gate',async()=>{
 const db=database();await readOpening(db,null);
 for(const user of [null,'alice']){
  state.user=user;
  for(const query of ['openingPreview=1','openingPreview=true','']){
   const r=await community.GET(new Request('https://ibtkr.space/api/community?'+query));assert.equal(r.status,423);
  }
 }
 assert.equal((await readOpening(db,null)).isOpen,false);
});

test('lowering an existing target keeps all cuts and opens immediately if already reached',async()=>{
  for(const count of [2,10]){
    resetDatabase({opened:false});const db=database();
    state.db.prepare('INSERT INTO opening_events (id,target) VALUES (?,?)').run(openingConfig.id,15);
    for(let i=0;i<count;i++)state.db.prepare('INSERT INTO opening_cuts VALUES (?,?,?)').run(openingConfig.id,'existing-'+i,'2026-10-10T12:00:00.000Z');
    const result=await readOpening(db,null);assert.equal(result.target,10);assert.equal(result.count,count);assert.equal(result.isOpen,count===10);
    const openedAt=result.openedAt;const repeat=await readOpening(db,null);assert.equal(repeat.openedAt,openedAt);
    assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts').get().n,count);
  }
});

