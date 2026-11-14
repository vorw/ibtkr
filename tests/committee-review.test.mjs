import assert from 'node:assert/strict';
import {test,beforeEach,afterEach,after,mock} from 'node:test';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {state,resetDatabase,database} from './community-fixture.mjs';
const jobs=[];
const workerStub='data:text/javascript,'+encodeURIComponent(`export default {fetch(){return new Response('site')}};export const ensureWeeklySchema=()=>{throw Error('cron ran')};export const finalizeClosedWeeks=()=>{throw Error('cron ran')};export const runWeeklyEmailJob=()=>{throw Error('email ran')}`);
registerHooks({resolve(s,c,next){
 if(c.parentURL?.endsWith('/worker.ts')&&['vinext/server/fetch-handler','./lib/weekly-db','./lib/weekly-schema','./lib/weekly-email'].includes(s))return {url:workerStub,shortCircuit:true};
 const paths={'@/lib/auth-server':'tests/community-fixture.mjs','@/lib/database':'tests/community-fixture.mjs','@/lib/profile':'lib/profile.ts','@/lib/weekly-schema':'lib/weekly-schema.ts','@/lib/community-read':'lib/community-read.ts','@/lib/opening':'lib/opening.ts','@/lib/weekly-opening':'lib/weekly-opening.ts','@/lib/drawings':'lib/drawings.ts','@/lib/drawing-policy':'lib/drawing-policy.ts','@/lib/challenges':'lib/challenges.ts','@/lib/weekly':'lib/weekly.ts','@/lib/committee-review.js':'lib/committee-review.js','./weekly':'lib/weekly.ts','./weekly-content':'lib/weekly-content.ts','./weekly-db':'lib/weekly-db.ts','./drawings':'lib/drawings.ts','./weekly-ribbon-policy':'lib/weekly-ribbon-policy.ts','./lib/maintenance':'lib/maintenance.ts'};
 return paths[s]?{url:new URL('../'+paths[s],import.meta.url).href,shortCircuit:true}:next(s,c);
},load(url,c,next){return url.endsWith('.sql?raw')?{format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true}:next(url,c)}});
const {GET,POST}=await import('../app/api/community/route.ts');
const {POST:cut}=await import('../app/api/weekly-opening/route.ts');
const {ensureWeeklySchema}=await import('../lib/weekly-schema.ts');
const {currentChallenge,displayedChallenge,findWeek}=await import('../lib/weekly.ts');
const {isMaintenanceActive}=await import('../lib/maintenance.ts');
const worker=(await import('../worker.ts')).default;
const oldWeek='week-2026-11-11';
let ids;
beforeEach(async()=>{
 mock.timers.enable({apis:['Date'],now:new Date('2026-11-14T09:00:00.000Z')});
 resetDatabase();await ensureWeeklySchema(database());state.databaseNow='2026-11-14T09:00:00.000Z';
 for(const [id,name] of [['alice','أحمد'],['bob','محمد'],['carol','سارة']])state.db.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run(id,name,name,'2026-11-07T10:00:00.000Z','2026-11-07T10:00:00.000Z');
 ids=[randomUUID(),randomUUID(),randomUUID()];
 for(let i=0;i<3;i++)state.db.prepare('INSERT INTO ideas (id,user_id,challenge_id,name,title,body,created_at,angle_id) VALUES (?,?,?,?,?,?,?,?)').run(ids[i],['alice','bob','carol'][i],oldWeek,['أحمد','محمد','سارة'][i],'رمز تغليف '+i,'هذه رسمة سابقة محفوظة.','2026-11-07T10:00:00.000Z','change');
 for(const [idea,user] of [[ids[0],'bob'],[ids[0],'carol'],[ids[1],'alice'],[ids[1],'carol']])state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(idea,user,1);
});
afterEach(()=>mock.timers.reset());after(()=>state.db?.close());
const read=async(query='')=>{const r=await GET(new Request('https://ibtkr.space/api/community?'+query));assert.equal(r.status,200);return r.json()};
const snapshot=()=>Object.fromEntries(['ideas','reactions','comments','opening_events','opening_cuts','weekly_results','finalized_weeks'].map(t=>[t,state.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
test('review selects last week without changing the real schedule or requiring ribbon cuts',async()=>{
 assert.equal(currentChallenge().number,'06');assert.equal(displayedChallenge().id,oldWeek);
 assert.equal(isMaintenanceActive(),false);assert.equal(await (await worker.fetch(new Request('https://ibtkr.space/'),{},{})).text(),'site');
 const data=await read();assert.equal(data.weekly.current.id,oldWeek);assert.equal(data.weekly.selected.id,oldWeek);assert.equal(data.weekly.current.endsAt,'2026-11-13T21:00:00.000Z');assert.equal(data.weekly.current.drawingTheme,'packaging-icons');assert.equal(data.weekly.review,true);assert.equal(data.weekly.ribbonOpen,true);assert.equal(data.weekly.status,'closed');assert.equal(data.weekly.weeks[0].id,oldWeek);
 assert.equal(data.ideas.length,3);assert.equal(data.weekly.finalized,true);
 assert.deepEqual(data.weekly.leaders.map(x=>[x.rank,x.likes]),[[1,2],[1,2],[3,0]]);
 const original=snapshot();await read();assert.deepEqual(snapshot(),original);
});
test('guest access keeps normal identity restrictions while showing original rankings',async()=>{
 state.user=null;const data=await read();assert.equal(data.signedIn,false);assert.equal(data.ideas.length,0);assert.equal(data.weekly.leaders.length,3);assert.equal(data.weekly.selected.id,oldWeek);
});
test('archive selection works while the challenge page stays on week 05',async()=>{
 const data=await read('week=week-2026-10-14');assert.equal(data.weekly.current.id,oldWeek);assert.equal(data.weekly.selected.number,'01');
});
test('review blocks votes, comments, edits, submissions and cuts without changing results',async()=>{
 await read();const original=snapshot();
 for(const value of [
 {action:'react',ideaId:ids[1],liked:false},
 {action:'comment',id:randomUUID(),ideaId:ids[1],body:'اختبار اللجنة التقنية'},
 {action:'edit',id:ids[0],angleId:'change',title:'فكرة جديدة',body:'اختبار كتابة لا يغيّر البيانات'},
 {action:'idea',id:randomUUID(),challengeId:oldWeek,angleId:'change',title:'فكرة جديدة',body:'اختبار كتابة لا يغيّر البيانات'},
 ]){const r=await POST(new Request('https://ibtkr.space/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}));assert.equal(r.status,403);}
 const r=await cut(new Request('https://ibtkr.space/api/weekly-opening?week='+oldWeek,{method:'POST',body:'{"action":"cut"}'}));assert.equal(r.status,403);assert.deepEqual(snapshot(),original);
});
test('review permits normal profile setup for committee members',async()=>{
 state.user='reviewer';const r=await POST(new Request('https://ibtkr.space/api/community',{method:'POST',body:JSON.stringify({action:'profile',displayName:'مراجع اللجنة'})}));assert.equal(r.status,200);assert.equal((await r.json()).community.profile.displayName,'مراجع اللجنة');
});
test('cron cannot finalize or send winner emails during committee review',async()=>{
 await worker.scheduled({},{});assert.deepEqual(jobs,[]);
});
