import assert from 'node:assert/strict';
import { test, mock, afterEach } from 'node:test';
import { registerHooks } from 'node:module';

const stub = `export const calls=[];
export default {fetch(){calls.push('fetch');return new Response('normal site')}};
export async function ensureWeeklySchema(){calls.push('schema')}
export async function finalizeClosedWeeks(){calls.push('finalize')}
export async function runWeeklyEmailJob(){calls.push('email')}`;
const stubUrl = 'data:text/javascript,' + encodeURIComponent(stub);
registerHooks({resolve(s,c,next){
  if (['vinext/server/fetch-handler','./lib/weekly-db','./lib/weekly-schema','./lib/weekly-email'].includes(s)) return {url:stubUrl,shortCircuit:true};
  if (s==='./lib/maintenance') return {url:new URL('../lib/maintenance.ts',import.meta.url).href,shortCircuit:true};
  return next(s,c);
}});
const {calls}=await import(stubUrl);
const worker=(await import('../worker.ts')).default;
const {maintenanceResponse,MAINTENANCE_ENDS_AT}=await import('../lib/maintenance.ts');
const end=Date.parse(MAINTENANCE_ENDS_AT);
afterEach(()=>{mock.timers.reset();calls.length=0});

test('all page routes show a temporary no-store maintenance response before the deadline',async()=>{
  for(const path of ['/','/login','/drawing-preview2','/lab/private-preview','/?view=leaderboard']){
    const response=maintenanceResponse(new Request('https://ibtkr.space'+path),end-1);
    assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(response.headers.get('retry-after'),'Fri, 20 Nov 2026 21:00:00 GMT');
    const html=await response.text();
    assert.match(html,/نعود السبت، ٢١ نوفمبر/);
    assert.match(html,/الحين وقت المذاكرة/);
    assert.match(html,/الله يفتح عليكم وييسّر اختباراتكم/);
  }
});
test('stale clients cannot submit, vote, cut ribbons or run email endpoints',async()=>{
  for(const path of ['/api/community','/api/weekly-opening','/api/weekly-email','/api/drawing']){
    for(const method of ['GET','POST','PUT','DELETE']){
      const response=maintenanceResponse(new Request('https://ibtkr.space'+path,{method}),end-1);
      assert.equal(response.status,503);assert.equal((await response.json()).code,'maintenance');
    }
  }
  assert.equal(maintenanceResponse(new Request('https://ibtkr.space/assets/ftc-logo.svg',{method:'POST'}),end-1).status,503);
});
test('only the exact branding and font assets bypass the pause; HEAD bodies are empty',async()=>{
  for(const path of ['/assets/ftc-logo.svg','/favicon.svg','/fonts/plex-arabic-regular.woff2','/fonts/plex-arabic-medium.woff2']) assert.equal(maintenanceResponse(new Request('https://ibtkr.space'+path),end-1),null);
  assert.equal(maintenanceResponse(new Request('https://ibtkr.space/assets/anything.js'),end-1).status,503);
  const response=maintenanceResponse(new Request('https://ibtkr.space/',{method:'HEAD'}),end-1);
  assert.equal(response.status,503);assert.equal(await response.text(),'');
});
test('worker blocks requests and scheduled work without touching application handlers or the database',async()=>{
  mock.timers.enable({apis:['Date'],now:end-1});
  assert.equal((await worker.fetch(new Request('https://ibtkr.space/api/community',{method:'POST'}),{},{})).status,503);
  await worker.scheduled({},{});assert.deepEqual(calls,[]);
});
test('at exactly Saturday midnight Riyadh, requests and the existing cron resume automatically',async()=>{
  mock.timers.enable({apis:['Date'],now:end});
  assert.equal(maintenanceResponse(new Request('https://ibtkr.space/')),null);
  assert.equal(await (await worker.fetch(new Request('https://ibtkr.space/'),{},{})).text(),'normal site');
  await worker.scheduled({},{});
  assert.deepEqual(calls,['fetch','schema','finalize','email']);
});

