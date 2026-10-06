import assert from 'node:assert/strict';
import { test,beforeEach,afterEach,after,mock } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { state,resetDatabase,database } from './community-fixture.mjs';

registerHooks({resolve(s,c,next){
  const aliases={'@/lib/auth-server':'./community-fixture.mjs','@/lib/database':'./community-fixture.mjs',
    '@/lib/opening':'../lib/opening.ts','@/lib/challenges':'../lib/challenges.ts','@/lib/profile':'../lib/profile.ts',
    '@/lib/community-read':'../lib/community-read.ts','@/lib/weekly-schema':'../lib/weekly-schema.ts','@/lib/weekly':'../lib/weekly.ts',
    './weekly':'../lib/weekly.ts','./weekly-content':'../lib/weekly-content.ts','./weekly-db':'../lib/weekly-db.ts'};
  if(aliases[s])return {url:new URL(aliases[s],import.meta.url).href,shortCircuit:true};
  return next(s,c);
},load(url,c,next){
  if(url.endsWith('.sql?raw'))return {format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true};
  return next(url,c);
}});
const {readOpening,cutOpening,openingConfig}=await import('../lib/opening.ts');
const {GET,POST}=await import('../app/api/opening/route.ts');
const community=await import('../app/api/community/route.ts');
const originalConfig={...openingConfig};
beforeEach(()=>{Object.assign(openingConfig,originalConfig);resetDatabase({opened:false});mock.timers.enable({apis:['Date'],now:new Date('2026-10-07T12:00:00.000Z')});});
afterEach(()=>{mock.timers.reset();Object.assign(openingConfig,originalConfig);});
after(()=>state.db?.close());
const request=(body={action:'cut'},headers={})=>new Request('https://ibtkr.space/api/opening',{method:'POST',headers:{Origin:'https://ibtkr.space','Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});

test('guests can read shared progress without exposing participant IDs, names or emails',async()=>{
  state.user=null;const response=await GET(new Request('https://ibtkr.space/api/opening'));const data=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(data,{eventId:openingConfig.id,target:2,count:0,isOpen:false,signedIn:false,hasCut:false,openedAt:null});
});
test('two distinct verified accounts open once; refreshing and repeated cuts never increase the count',async()=>{
  const db=database();let first=await cutOpening(db,'alice');assert.equal(first.count,1);assert.equal(first.hasCut,true);assert.equal(first.isOpen,false);
  first=await cutOpening(db,'alice');assert.equal(first.count,1);assert.equal((await readOpening(db,'bob')).hasCut,false);
  const second=await cutOpening(db,'bob');assert.equal(second.count,2);assert.equal(second.isOpen,true);
  const timestamp=second.openedAt;mock.timers.tick(60000);
  const later=await cutOpening(db,'carol');assert.equal(later.count,2);assert.equal(later.isOpen,true);assert.equal(later.hasCut,false);assert.equal(later.openedAt,timestamp);
  assert.equal((await readOpening(database(),null)).isOpen,true);
});
test('twenty concurrent accounts cannot overshoot the two-user limit',async()=>{
  const db=database();await readOpening(db,null);
  const results=await Promise.all(Array.from({length:20},(_,i)=>cutOpening(db,'participant-'+i)));
  assert.ok(results.every(r=>r.count<=2));assert.equal((await readOpening(db,null)).count,2);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts').get().n,2);
});
test('guests and spoofed identity headers cannot contribute, and body fields cannot choose an identity',async()=>{
  state.user=null;assert.equal((await POST(request())).status,401);
  assert.equal((await POST(request({action:'cut'},{'oai-authenticated-user-id':'victim'}))).status,401);
  state.user='alice';assert.equal((await POST(request({action:'cut',userId:'bob'}))).status,400);
  assert.equal((await readOpening(database(),null)).count,0);
});
test('cross-site, malformed and oversized requests do not count',async()=>{
  for(const headers of [{Origin:'https://evil.test'},{'sec-fetch-site':'cross-site'}])assert.equal((await POST(request({action:'cut'},headers))).status,403);
  for(const body of ['{broken','x'.repeat(1001),{action:'reset'},{action:'cut',count:2}])assert.equal((await POST(request(body))).status,400);
  assert.equal((await readOpening(database(),null)).count,0);
});
test('a newly signed-in account can cut without first choosing a username',async()=>{
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM profiles').get().n,0);
  const result=await POST(request());assert.equal(result.status,200);assert.equal((await result.json()).count,1);
});
test('site reads and writes are closed before the second cut, then reopen without changing the weekly schedule',async()=>{
  const read=()=>community.GET(new Request('https://ibtkr.space/api/community'));
  const write=()=>community.POST(new Request('https://ibtkr.space/api/community',{method:'POST',headers:{Origin:'https://ibtkr.space','Content-Type':'application/json'},body:JSON.stringify({action:'profile',displayName:'أحمد'})}));
  assert.equal((await read()).status,423);assert.equal((await write()).status,423);
  await cutOpening(database(),'alice');assert.equal((await read()).status,423);
  await cutOpening(database(),'bob');const opened=await read();assert.equal(opened.status,200);
  const data=await opened.json();assert.equal(data.weekly.current.id,'week-2026-10-07');assert.equal(data.weekly.current.number,'01');
  assert.equal((await write()).status,200);assert.deepEqual(data.progress,{ideas:0,reviews:0,xp:0});
});
test('an interrupted final cut rolls back both the contribution and opening, and retries safely',async()=>{
  const db=database();await cutOpening(db,'alice');let fail=true;
  const broken={...db,prepare(sql){
    if(sql.startsWith('UPDATE opening_events'))return {
      bind(...values){
        return {
          async run(){
            if(fail)throw Error('Simulated opening write failure');
            return db.prepare(sql).bind(...values).run();
          },
        };
      },
    };
    return db.prepare(sql);
  }};
  await assert.rejects(cutOpening(broken,'bob'),/Simulated opening write failure/);
  const closed=await readOpening(db,null);assert.equal(closed.count,1);assert.equal(closed.isOpen,false);
  fail=false;assert.equal((await cutOpening(broken,'bob')).isOpen,true);assert.equal((await readOpening(db,null)).count,2);
});
test('a different test event can be prepared without destroying the previous ceremony',async()=>{
  const original=openingConfig.id;await cutOpening(database(),'alice');await cutOpening(database(),'bob');
  openingConfig.id='ribbon-revised-test';const next=await readOpening(database(),'alice');assert.equal(next.count,0);assert.equal(next.isOpen,false);
  assert.notEqual(state.db.prepare('SELECT opened_at FROM opening_events WHERE id=?').get(original).opened_at,null);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts WHERE event_id=?').get(original).n,2);
});
test('disabling the ceremony removes the gate without deleting existing progress',async()=>{
  await cutOpening(database(),'alice');openingConfig.enabled=false;
  assert.equal((await readOpening(database(),null)).isOpen,true);
  assert.equal(state.db.prepare('SELECT COUNT(*) n FROM opening_cuts').get().n,1);
});
