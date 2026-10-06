import assert from 'node:assert/strict';
import { test, beforeEach, after } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { state, resetDatabase, database } from './community-fixture.mjs';

registerHooks({ resolve(s,c,next) {
  const files={'./weekly':'weekly.ts','./weekly-content':'weekly-content.ts','./weekly-email-schema':'weekly-email-schema.ts','./weekly-email-template':'weekly-email-template.ts','./weekly-email-html':'weekly-email-html.ts'};
  if(files[s])return {url:new URL('../lib/'+files[s],import.meta.url).href,shortCircuit:true};
  return next(s,c);
},load(url,c,next){
  if(url.endsWith('.sql?raw'))return {format:'module',source:'export default '+JSON.stringify(readFileSync(new URL(url),'utf8'))+';',shortCircuit:true};
  return next(url,c);
}});
const { ensureWeeklySchema }=await import('../lib/weekly-schema.ts');
const { ensureWeeklyEmailSchema }=await import('../lib/weekly-email-schema.ts');
const { enqueueWeeklyEmails,processWeeklyEmails,createWeeklyMailer,WeeklyEmailError,runWeeklyEmailJob }=await import('../lib/weekly-email.ts');
const { renderWeeklyEmail }=await import('../lib/weekly-email-template.ts');
const { weeklyChallenges }=await import('../lib/weekly.ts');
const { finalizeClosedWeeks }=await import('../lib/weekly-db.ts');
const { readResume,signInHref }=await import('../lib/participation.ts');
const week=weeklyChallenges[0];
const closed=new Date(week.endsAt);
let db;
beforeEach(async()=>{resetDatabase();db=database();await ensureWeeklySchema(db);await ensureWeeklyEmailSchema(db);});
after(()=>state.db?.close());
function frozen(user,rank,likes,name='أحمد',id=week.id){
  state.db.prepare('INSERT OR IGNORE INTO finalized_weeks VALUES (?,?)').run(id,closed.toISOString());
  state.db.prepare('INSERT INTO weekly_results VALUES (?,?,?,?,?,?,?)').run(id,user,name,likes,1,rank,closed.toISOString());
}
const deliveries=()=>state.db.prepare('SELECT * FROM weekly_email_deliveries ORDER BY rank,user_id').all();
function mailer(extra={}){
  const calls=[];
  return {from:'ابتكر <hello@auth.ibtkr.space>',calls,recipient:async id=>id+'@example.test',send:async(payload,key)=>{calls.push({payload,key});return 'mail-'+calls.length;},...extra};
}
const later=(minutes)=>new Date(closed.getTime()+minutes*60000);

test('only frozen positive-like top-three ranks are queued, including ties, once',async()=>{
  frozen('alice',1,9);frozen('bob',1,9);frozen('carol',3,5);frozen('dave',4,3);frozen('eve',2,0);
  await enqueueWeeklyEmails(db,later(-1));assert.equal(deliveries().length,0);
  await Promise.all([enqueueWeeklyEmails(db,closed),enqueueWeeklyEmails(db,closed)]);
  assert.deepEqual(deliveries().map(x=>x.user_id),['alice','bob','carol']);
  state.db.prepare('DELETE FROM finalized_weeks').run();state.db.prepare('DELETE FROM weekly_email_deliveries').run();
  await enqueueWeeklyEmails(db,closed);assert.equal(deliveries().length,0);
});

test('finalization precedes mail and uses the sum of likes across angles',async()=>{
  const created='2026-10-05T12:00:00.000Z';
  state.db.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('alice','أحمد','احمد',created,created);
  for(const [id,angle] of [['entry-a','change'],['entry-b','reverse']]){
    state.db.prepare('INSERT INTO ideas VALUES (?,?,?,?,?,?,?,?)').run(id,'alice',week.id,'أحمد','عنوان الفكرة','شرح الفكرة المقترحة.',created,angle);
    state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'bob',1);
    state.db.prepare('INSERT INTO reactions VALUES (?,?,?)').run(id,'alice',1);
  }
  await finalizeClosedWeeks(db,closed);await enqueueWeeklyEmails(db,closed);
  assert.equal(deliveries()[0].likes,2);assert.equal(deliveries()[0].entries,2);
  const m=mailer();await processWeeklyEmails(db,m,closed);assert.match(m.calls[0].payload.text,/٢ إعجاب/);
});

test('successful delivery is private, individual and never repeated',async()=>{
  frozen('alice',1,10);frozen('bob',2,7);frozen('carol',3,4);await enqueueWeeklyEmails(db,closed);
  const m=mailer();assert.equal((await processWeeklyEmails(db,m,closed)).sent,3);
  await processWeeklyEmails(db,m,later(5));await enqueueWeeklyEmails(db,later(5));await processWeeklyEmails(db,m,later(5));
  assert.equal(m.calls.length,3);assert.ok(m.calls.every(x=>x.payload.to.length===1));
  assert.ok(deliveries().every(x=>x.status==='sent'&&x.provider_id));
});

test('concurrent workers claim one delivery only',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);const m=mailer();
  await Promise.all([processWeeklyEmails(db,m,closed),processWeeklyEmails(db,m,closed)]);
  assert.equal(m.calls.length,1);assert.equal(deliveries()[0].status,'sent');
});

test('transport ambiguity retries identical payload/key despite name, sender and template changes',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);const attempts=[];
  const m=mailer({send:async(payload,key)=>{attempts.push({payload,key});if(attempts.length===1)throw new WeeklyEmailError('email_transport_unknown');return 'mail-retry';}});
  await processWeeklyEmails(db,m,closed);assert.equal(deliveries()[0].status,'pending');
  state.db.prepare('UPDATE weekly_email_deliveries SET name=?').run('اسم جديد');m.from='ابتكر <different@auth.ibtkr.space>';
  await processWeeklyEmails(db,m,later(10));assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);assert.equal(deliveries()[0].status,'sent');
});

test('accepted mail followed by a failed status write reuses provider idempotency',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);let fail=true;
  const broken={...db,prepare(sql){if(fail&&sql.includes("SET status='sent'"))return {bind(){return {async run(){throw Error('D1 unavailable');}}}};return db.prepare(sql);}};
  const m=mailer();await processWeeklyEmails(broken,m,closed);assert.equal(deliveries()[0].last_error_code,'accepted_status_write_failed');
  fail=false;await processWeeklyEmails(broken,m,later(10));assert.equal(m.calls.length,2);assert.deepEqual(m.calls[0],m.calls[1]);
});

test('an expired lease can recover; an active lease cannot be stolen',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);
  state.db.prepare("UPDATE weekly_email_deliveries SET status='sending',lease_token='old',lease_until=?").run(later(2).toISOString());
  const m=mailer();await processWeeklyEmails(db,m,closed);assert.equal(m.calls.length,0);
  await processWeeklyEmails(db,m,later(5));assert.equal(m.calls.length,1);
});

test('ambiguous requests stop before provider deduplication expires',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);const m=mailer({send:async()=>{throw new WeeklyEmailError('email_transport_unknown');}});
  await processWeeklyEmails(db,m,closed);let sent=0;m.send=async()=>{sent++;return 'should-not-send';};
  await processWeeklyEmails(db,m,later(22*60+1));assert.equal(sent,0);assert.equal(deliveries()[0].status,'needs_review');
});

test('missing recipients are skipped and lookup outages retry without sending',async()=>{
  frozen('alice',1,10);frozen('bob',2,7);await enqueueWeeklyEmails(db,closed);
  const m=mailer({recipient:async id=>{if(id==='alice')return null;throw Error('Auth unavailable');}});
  await processWeeklyEmails(db,m,closed);assert.equal(m.calls.length,0);
  assert.equal(deliveries()[0].status,'skipped');assert.equal(deliveries()[1].status,'pending');
});

test('an account email change never sends a retry to the old address',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);const m=mailer({send:async()=>{throw new WeeklyEmailError('email_transport_unknown');}});
  await processWeeklyEmails(db,m,closed);let sent=0;m.recipient=async()=> 'new@example.test';m.send=async()=>{sent++;return 'no';};
  await processWeeklyEmails(db,m,later(10));assert.equal(sent,0);assert.equal(deliveries()[0].last_error_code,'recipient_changed');
});

test('permanent provider rejection is visible and never loops',async()=>{
  frozen('alice',1,10);await enqueueWeeklyEmails(db,closed);let attempts=0;
  const m=mailer({send:async()=>{attempts++;throw new WeeklyEmailError('email_http_422',true);}});
  await processWeeklyEmails(db,m,closed);await processWeeklyEmails(db,m,later(10));assert.equal(attempts,1);assert.equal(deliveries()[0].status,'needs_review');
});

test('over 100 tied winners are drained in bounded batches without dropping anyone',async()=>{
  for(let i=0;i<105;i++)frozen('member-'+String(i).padStart(3,'0'),1,10);
  await enqueueWeeklyEmails(db,closed);const m=mailer();await processWeeklyEmails(db,m,closed);assert.equal(m.calls.length,5);
  for(let i=1;i<=20;i++)await processWeeklyEmails(db,m,later(i*5));
  assert.equal(m.calls.length,105);assert.ok(deliveries().every(x=>x.status==='sent'));
});

test('approved design fills real data, escapes HTML and keeps the weekly archive link',()=>{
  for(let rank=1;rank<=3;rank++){
    const e=renderWeeklyEmail(week,{user_id:'alice',name:'<img src=x onerror=evil()>',rank,likes:42,entries:1});
    assert.ok(!e.html.includes('<img'));assert.ok(e.html.includes('&lt;img'));assert.ok(!e.html.includes('{{'));
    assert.ok(e.html.includes('FTC / IBTKR'));assert.ok(e.html.includes('>0'+rank+'</div>'));assert.ok(e.html.includes('href="https://ibtkr.space/?view=leaderboard&amp;week='+week.id+'"'));
    assert.ok(e.text.includes('٦ أكتوبر ٢٠٢٦'));assert.ok(e.text.includes('٤٢ إعجاب'));
    if(rank!==1)assert.ok(!e.subject.includes('مبتكر الأسبوع'));
  }
  assert.throws(()=>renderWeeklyEmail(week,{name:'أحمد',rank:4,likes:10}));
});

test('leaderboard links retain the intended week through sign-in',()=>{
  const resume=readResume('?view=leaderboard&week='+week.id);assert.equal(resume.week,week.id);
  assert.ok(decodeURIComponent(signInHref(resume)).includes('week='+week.id));
  assert.equal(readResume('?week=https://evil.test').week,undefined);
});

test('mailer validates configuration and verified authoritative account IDs',async()=>{
  assert.throws(()=>createWeeklyMailer({}),/configuration_missing/);
  const id='a8226d86-0ce2-48b7-8ad9-58c1a41c155c';let user={id,email:'verified@example.test',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false};const calls=[];
  const m=createWeeklyMailer({RESEND_API_KEY:'re_test',SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_URL:'https://example.supabase.co',WEEKLY_EMAIL_FROM:'ابتكر <hello@auth.ibtkr.space>'},async(url,init)=>{
    calls.push({url:String(url),init});return Response.json(user);
  });
  assert.equal(await m.recipient('supabase:'+id),'verified@example.test');assert.ok(calls[0].url.endsWith('/auth/v1/admin/users/'+id));
  assert.equal(await m.recipient('legacy-account'),null);
  user={...user,email_confirmed_at:null};assert.equal(await m.recipient('supabase:'+id),null);
  user={...user,email_confirmed_at:'2026-10-01',id:'someone-else'};assert.equal(await m.recipient('supabase:'+id),null);
});

test('Resend request uses one recipient, frozen HTML/text and the idempotency header',async()=>{
  const calls=[];const m=createWeeklyMailer({RESEND_API_KEY:'re_test',SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_URL:'https://example.supabase.co',WEEKLY_EMAIL_FROM:'ابتكر <hello@auth.ibtkr.space>'},async(url,init)=>{calls.push({url,init});return Response.json({id:'provider-id'});});
  const payload={from:m.from,to:['one@example.test'],...renderWeeklyEmail(week,{name:'أحمد',rank:1,likes:10})};
  assert.equal(await m.send(payload,'weekly-key'),'provider-id');assert.equal(calls[0].url,'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers['Idempotency-Key'],'weekly-key');assert.deepEqual(JSON.parse(calls[0].init.body),payload);
});

test('disabled sending does nothing and absent keys leave final results and pending work intact',async()=>{
  frozen('alice',1,10);await runWeeklyEmailJob({DB:db,WEEKLY_EMAIL_ENABLED:'false'},closed);assert.equal(deliveries().length,0);
  await assert.rejects(runWeeklyEmailJob({DB:db,WEEKLY_EMAIL_ENABLED:'true'},closed),/configuration_missing/);
  assert.equal(deliveries()[0].status,'pending');assert.equal(state.db.prepare('SELECT COUNT(*) n FROM weekly_results').get().n,1);
});
