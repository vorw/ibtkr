import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
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
  if (['./site-settings','./maintenance-page'].includes(s)) return {url:new URL('../lib/'+s.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
  return next(s,c);
}});
const {calls}=await import(stubUrl);
const worker=(await import('../worker.ts')).default;
const {siteSettings}=await import('../lib/site-settings.ts');
const {maintenanceResponse,isMaintenanceActive}=await import('../lib/maintenance.ts');
afterEach(()=>{siteSettings.maintenance.enabled=true;calls.length=0});

test('maintenance is enabled without an expiring date or review bypass',async()=>{
  assert.equal(isMaintenanceActive(),true);
  for(const path of ['/','/login','/drawing-preview2','/lab/private-preview','/?view=leaderboard','/?openingPreview=1']){
    const response=maintenanceResponse(new Request('https://ibtkr.space'+path));
    assert.equal(response.status,503);
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(response.headers.get('retry-after'),'3600');
    const html=await response.text();
    assert.match(html,/ونرجع نبتكر/);
    assert.match(html,/مشاركاتكم ونتائجكم محفوظة/);
    assert.doesNotMatch(html,/نوفمبر|اختبارات|resumesAt|committee/);
    assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
  }
});
test('stale clients cannot publish, vote, cut ribbons or run email endpoints',async()=>{
  for(const path of ['/api','/api/community','/api/weekly-opening','/api/weekly-email','/api/drawing']){
    for(const method of ['GET','POST','PUT','DELETE']){
      const response=await worker.fetch(new Request('https://ibtkr.space'+path,{method}),{},{});
      assert.equal(response.status,503);assert.equal((await response.json()).code,'maintenance');
    }
  }
  await worker.scheduled({},{});assert.deepEqual(calls,[]);
});
test('only exact branding/font reads bypass maintenance and HEAD bodies are empty',async()=>{
  for(const path of ['/assets/ftc-logo.svg','/favicon.svg','/fonts/plex-arabic-regular.woff2','/fonts/plex-arabic-medium.woff2']){
    for(const method of ['GET','HEAD'])assert.equal(maintenanceResponse(new Request('https://ibtkr.space'+path,{method})),null);
    assert.equal(maintenanceResponse(new Request('https://ibtkr.space'+path,{method:'POST'})).status,503);
  }
  for(const path of ['/assets/anything.js','/assets/ftc-logo.svg/extra','/fonts/other.woff2','/api/community']){
    const response=maintenanceResponse(new Request('https://ibtkr.space'+path,{method:'HEAD'}));
    assert.equal(response.status,503);assert.equal(await response.text(),'');
  }
});
test('disabling the switch restores the app and original scheduled work',async()=>{
  siteSettings.maintenance.enabled=false;
  assert.equal(isMaintenanceActive(),false);
  assert.equal(maintenanceResponse(new Request('https://ibtkr.space/')),null);
  assert.equal(await (await worker.fetch(new Request('https://ibtkr.space/'),{},{})).text(),'normal site');
  await worker.scheduled({},{});assert.deepEqual(calls,['fetch','schema','finalize','email']);
});
