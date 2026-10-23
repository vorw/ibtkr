import { getParticipant } from '@/lib/auth-server';
import { database } from '@/lib/database';
import { type Comment, type Idea } from '@/lib/challenges';
import { readCommunity } from '@/lib/community-read';
import { ensureWeeklySchema } from '@/lib/weekly-schema';
import { findWeek, currentChallenge } from '@/lib/weekly';
import { displayNameKey, validateDisplayName } from '@/lib/profile';
import { z } from 'zod';
import { readOpening } from '@/lib/opening';
import { readWeeklyOpening,concealWeeklyQuestion } from '@/lib/weekly-opening';
import { ensureDrawingSchema,drawingRevision } from '@/lib/drawings';
import { validDrawing,drawingDataLimit } from '@/lib/drawing-policy';

export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
});

type IdeaRow = Omit<Idea, 'isOwn' | 'liked' | 'comments'> & { user_id: string; liked: number };
type CommentRow = Omit<Comment, 'isOwn'> & { user_id: string; idea_id: string };
type ProfileRow = { display_name: string; name_key: string };

let profilesSchemaReady: Promise<void> | null = null;
async function ensureProfilesSchema(db: D1Database): Promise<void> {
  if (!profilesSchemaReady) {
    profilesSchemaReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS profiles (
        user_id text PRIMARY KEY NOT NULL,
        display_name text NOT NULL,
        name_key text NOT NULL,
        created_at text NOT NULL,
        updated_at text NOT NULL
      )`).run();
      await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name_key ON profiles (name_key)').run();
      await db.prepare(`WITH legacy_names AS (
        SELECT user_id, name, created_at FROM ideas
        UNION ALL
        SELECT user_id, name, created_at FROM comments
      ),
      ranked_names AS (
        SELECT user_id, name, created_at,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, name DESC) AS position
        FROM legacy_names
      )
      INSERT OR IGNORE INTO profiles (user_id,display_name,name_key,created_at,updated_at)
      SELECT user_id,trim(name),lower(trim(replace(name,'ـ',''))),created_at,created_at
      FROM ranked_names
      WHERE position=1 AND length(trim(name))>=2`).run();
    })();
  }
  try {
    await profilesSchemaReady;
  } catch (error) {
    profilesSchemaReady = null;
    throw error;
  }
}

async function getProfile(db: D1Database, userId: string): Promise<ProfileRow | null> {
  return db.prepare('SELECT display_name,name_key FROM profiles WHERE user_id=?').bind(userId).first<ProfileRow>();
}

async function visibleCommunity(...args:Parameters<typeof readCommunity>){
  const result=await readCommunity(...args),current=result.weekly.current;
  result.weekly.ribbonOpen=current?(await readWeeklyOpening(args[0],current)).isOpen:true;
  if(current&&!result.weekly.ribbonOpen){
    result.weekly.current=concealWeeklyQuestion(current);
    if(result.weekly.selected?.id===current.id)result.weekly.selected=concealWeeklyQuestion(current);
    result.weekly.weeks=result.weekly.weeks.map(week=>week.id===current.id?concealWeeklyQuestion(week):week);
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const user = await getParticipant(request);
    const db=database();
    const params=new URL(request.url).searchParams;
    // A discoverable read-only preview retains normal account checks. It cannot
    // add cuts, open the event, or bypass the POST opening guard.
    if(params.get('openingPreview')!=='1'&&!(await readOpening(db,user?.userId??null)).isOpen)return reply({error:'الافتتاح ما اكتمل. شارك في قصّ الشريط أولًا.'},423);
    await ensureProfilesSchema(db);
    await ensureWeeklySchema(db);
    return reply(await visibleCommunity(db,user?.userId??null,params));
  } catch (error) {
    console.error('Community load', error);
    return reply({ error: 'ما قدرنا نحمّل المشاركات. جرّب مرة ثانية.' }, 503);
  }
}

const common = { id: z.string().uuid() };
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('profile'), displayName: z.string().max(80) }),
  z.object({ action: z.literal('idea'), ...common, challengeId: z.string(), angleId: z.string(), title: z.string().trim().min(2).max(100), body: z.string().trim().min(2).max(2000), drawing:z.string().max(drawingDataLimit).optional() }),
  z.object({ action: z.literal('edit'), ...common, angleId: z.string(), title: z.string().trim().min(2).max(100), body: z.string().trim().min(2).max(2000), drawing:z.string().max(drawingDataLimit).optional() }),
  z.object({ action: z.literal('comment'), ...common, ideaId: z.string().uuid(), body: z.string().trim().min(5).max(1000) }),
  z.object({ action: z.literal('react'), ideaId: z.string().uuid(), liked: z.boolean() }),
]);

export async function POST(request: Request) {
  try {
    if(new URL(request.url).searchParams.get('openingPreview')==='1')return reply({error:'المعاينة للقراءة فقط.'},403);
    if (request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'طلب غير مسموح.' }, 403);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return reply({ error: 'طلب غير مسموح.' }, 403);

    const user = await getParticipant(request);
    if (!user) return reply({ error: 'سجّل دخولك عشان تحفظ مشاركتك. مسودتك باقية.' }, 401);

    const raw = await request.text();
    if (raw.length > drawingDataLimit+12000 || (raw.length>12000&&!raw.includes('"drawing"'))) return reply({ error: 'المشاركة كبيرة جدًا.' }, 413);

    let json: unknown;
    try { json = JSON.parse(raw); } catch { return reply({ error: 'صيغة المشاركة غير صالحة.' }, 400); }

    const parsed = schema.safeParse(json);
    if (!parsed.success) return reply({ error: 'تأكد من البيانات ثم جرّب ثانية.' }, 400);

    const value = parsed.data;
    const db = database();
    if(!(await readOpening(db,user.userId)).isOpen)return reply({error:'المشاركة تفتح بعد اكتمال الافتتاح.'},423);
    if(value.action==='idea'||value.action==='edit'){
      const current=currentChallenge();
      if(current&&!(await readWeeklyOpening(db,current)).isOpen)return reply({error:'سؤال الأسبوع ينتظر اكتمال قصّ الشريط لفتحه للجميع.'},423);
    }
    await ensureProfilesSchema(db);
    await ensureWeeklySchema(db);
    await ensureDrawingSchema(db);
    const now = new Date().toISOString();

    if (value.action === 'profile') {
      const normalized = validateDisplayName(value.displayName);
      if (!normalized) {
        return reply({ error: 'اختر اسمًا من حرفين إلى 30 حرفًا، بدون رموز غريبة.' }, 400);
      }

      const occupied = await db.prepare('SELECT user_id FROM profiles WHERE name_key=? AND user_id<>?')
        .bind(normalized.nameKey, user.userId)
        .first<{ user_id: string }>();
      if (occupied) return reply({ error: 'الاسم مستخدم بالفعل. جرّب اسمًا ثانيًا.' }, 409);

      // Legacy profiles were backfilled in SQL before JavaScript normalization existed.
      // Re-check their visible names with the current normalizer so variants such as
      // "أحمد" and "احمد" cannot become two separate community identities.
      const otherProfiles = await db.prepare('SELECT user_id,display_name FROM profiles WHERE user_id<>?')
        .bind(user.userId)
        .all<{ user_id: string; display_name: string }>();
      if (otherProfiles.results.some(row => displayNameKey(row.display_name) === normalized.nameKey)) {
        return reply({ error: 'الاسم مستخدم بالفعل. جرّب اسمًا ثانيًا.' }, 409);
      }

      try {
        await db.prepare(`INSERT INTO profiles (user_id,display_name,name_key,created_at,updated_at)
          VALUES (?,?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET
            display_name=excluded.display_name,
            name_key=excluded.name_key,
            updated_at=excluded.updated_at`)
          .bind(user.userId, normalized.displayName, normalized.nameKey, now, now)
          .run();
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('unique') || message.includes('constraint')) {
          return reply({ error: 'الاسم مستخدم بالفعل. جرّب اسمًا ثانيًا.' }, 409);
        }
        throw error;
      }

      return reply({ ok: true, community: await visibleCommunity(db,user.userId,new URL(request.url).searchParams) });
    }

    const profile = await getProfile(db, user.userId);
    if (!profile) return reply({ error: 'اختر اسمك الظاهر أول عشان تكمل.' }, 428);
    const participantName = profile.display_name;
    let ideaId: string;

    if (value.action === 'idea') {
      ideaId = value.id;
      const week=findWeek(value.challengeId);
      if (!week) return reply({error:'التحدّي غير موجود.'},404);
      if(week.submission==='drawing'){
        if(!validDrawing(value.drawing))return reply({error:'أضف رسمتك أولًا: ارسم هنا أو ارفع صورة.'},400);
        if(value.body.length>180)return reply({error:'اشرح رسمتك بجملة قصيرة، حتى ١٨٠ حرفًا.'},400);
      }else if(value.drawing!==undefined||value.body.length<10)return reply({error:'تأكد من نص المشاركة.'},400);
      const revision=value.drawing?await drawingRevision(value.drawing):null;
      const previous=await db.prepare('SELECT user_id,challenge_id,angle_id,title,body FROM ideas WHERE id=?').bind(value.id).first<IdeaRow>();
      if(previous){
        if(previous.user_id!==user.userId || previous.challenge_id!==value.challengeId || previous.angle_id!==value.angleId || previous.title!==value.title || previous.body!==value.body) return reply({error:'سبق حفظ نسخة مختلفة من هذه المسودة.'},409);
        const attachment=await db.prepare('SELECT revision FROM idea_drawings WHERE idea_id=?').bind(value.id).first<{revision:string}>();
        if((attachment?.revision??null)!==revision)return reply({error:'سبق حفظ رسمة مختلفة من هذه المسودة.'},409);
        return reply({ok:true,ideaId,community:await visibleCommunity(db,user.userId,new URL(request.url).searchParams,ideaId)});
      }
      if(currentChallenge()?.id!==week.id) return reply({error:'انتهت المشاركة لهذا الأسبوع. جرّب التحدّي الحالي؛ مسودتك باقية.'},409);
      if(!week.angles.some(angle=>angle.id===value.angleId)) return reply({error:'اختر زاوية من زوايا التحدّي.'},400);
      const statement=db.prepare(`INSERT INTO ideas (id,user_id,challenge_id,angle_id,name,title,body,created_at)
        SELECT ?,?,?,?,?,?,?,? WHERE ?<=strftime('%Y-%m-%dT%H:%M:%fZ','now') AND strftime('%Y-%m-%dT%H:%M:%fZ','now')<?
        ON CONFLICT(id) DO NOTHING`)
        .bind(value.id,user.userId,week.id,value.angleId,participantName,value.title,value.body,now,week.startsAt,week.endsAt);
      const writes=[statement];
      if(value.drawing)writes.push(db.prepare(`INSERT OR IGNORE INTO idea_drawings (idea_id,image_data,revision)
        SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM ideas WHERE id=? AND user_id=? AND challenge_id=? AND angle_id=? AND title=? AND body=?)`)
        .bind(value.id,value.drawing,revision,value.id,user.userId,week.id,value.angleId,value.title,value.body));
      const [savedWrite]=await db.batch(writes);
      if(!savedWrite.meta.changes) return reply({error:'انتهى وقت المشاركة. مسودتك باقية.'},409);

      const saved = await db.prepare('SELECT user_id,challenge_id,angle_id,title,body FROM ideas WHERE id=?').bind(value.id).first<Pick<IdeaRow, 'user_id' | 'challenge_id' | 'angle_id' | 'title' | 'body'>>();
      if (!saved || saved.user_id !== user.userId || saved.challenge_id !== value.challengeId || saved.angle_id !== value.angleId || saved.title !== value.title || saved.body !== value.body) {
        return reply({ error: 'سبق حفظ نسخة مختلفة من هذه المسودة. افتحها من أفكارك لتطويرها.' }, 409);
      }
      if(revision&&(await db.prepare('SELECT revision FROM idea_drawings WHERE idea_id=?').bind(value.id).first<{revision:string}>())?.revision!==revision)return reply({error:'لم تتأكد مطابقة الرسمة. أعد المحاولة بنفس المسودة.'},409);
    } else if (value.action === 'edit') {
      ideaId = value.id;
      const row = await db.prepare('SELECT user_id,challenge_id FROM ideas WHERE id=?').bind(value.id).first<{ user_id: string; challenge_id: string }>();
      if (!row) return reply({ error: 'الفكرة غير موجودة.' }, 404);
      if (row.user_id !== user.userId) return reply({ error: 'تقدر تعدّل فكرتك أنت فقط.' }, 403);
      const week=findWeek(row.challenge_id);
      if(!week || currentChallenge()?.id!==week.id) return reply({error:'أُغلقت هذه المشاركة للحفاظ على نتيجة الأسبوع.'},409);
      const existing=await db.prepare('SELECT revision FROM idea_drawings WHERE idea_id=?').bind(value.id).first<{revision:string}>();
      if(week.submission==='drawing'){
        if(value.body.length>180||(!(value.drawing===undefined&&existing)&&!validDrawing(value.drawing)))return reply({error:'أضف رسمة وجملة قصيرة حتى ١٨٠ حرفًا.'},400);
      }else if(value.drawing!==undefined||value.body.length<10)return reply({error:'تأكد من نص المشاركة.'},400);
      if(!week.angles.some(angle=>angle.id===value.angleId)) return reply({error:'اختر زاوية من زوايا التحدّي.'},400);
      const writes=[db.prepare(`UPDATE ideas SET name=?,title=?,body=?,angle_id=? WHERE id=? AND user_id=? AND strftime('%Y-%m-%dT%H:%M:%fZ','now')<?`)
        .bind(participantName,value.title,value.body,value.angleId,value.id,user.userId,week.endsAt)];
      if(value.drawing)writes.push(db.prepare(`INSERT INTO idea_drawings (idea_id,image_data,revision)
        SELECT ?,?,? WHERE changes()>0 AND EXISTS (SELECT 1 FROM ideas WHERE id=? AND user_id=?)
        ON CONFLICT(idea_id) DO UPDATE SET image_data=excluded.image_data,revision=excluded.revision`)
        .bind(value.id,value.drawing,await drawingRevision(value.drawing),value.id,user.userId));
      const [changed]=await db.batch(writes);
      if(!changed.meta.changes) return reply({error:'انتهى وقت تعديل المشاركة.'},409);
    } else {
      ideaId = value.ideaId;
      const row = await db.prepare('SELECT user_id,challenge_id FROM ideas WHERE id=?').bind(value.ideaId).first<{ user_id: string; challenge_id: string }>();
      if (!row) return reply({ error: 'الفكرة غير موجودة.' }, 404);

      if (value.action === 'comment') {
        await db.prepare('INSERT INTO comments (id,idea_id,user_id,name,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
          .bind(value.id, value.ideaId, user.userId, participantName, value.body, now).run();

        const saved = await db.prepare('SELECT user_id,idea_id,body FROM comments WHERE id=?').bind(value.id).first<Pick<CommentRow, 'user_id' | 'idea_id' | 'body'>>();
        if (!saved || saved.user_id !== user.userId || saved.idea_id !== value.ideaId || saved.body !== value.body) {
          return reply({ error: 'سبق حفظ تعليق مختلف من هذه المسودة. راجع النقاش قبل الإرسال مجددًا.' }, 409);
        }
      } else {
        if (row.user_id === user.userId) return reply({ error: 'خلّ التشجيع للأفكار الثانية.' }, 400);
        const week=findWeek(row.challenge_id);
        if(!week || currentChallenge()?.id!==week.id) return reply({error:'أُغلق التصويت لهذا الأسبوع.'},409);
        const changed=await db.prepare(`INSERT INTO reactions (idea_id,user_id,liked)
          SELECT ?,?,? WHERE strftime('%Y-%m-%dT%H:%M:%fZ','now')<?
          ON CONFLICT(idea_id,user_id) DO UPDATE SET liked=excluded.liked`)
          .bind(value.ideaId,user.userId,value.liked?1:0,week.endsAt).run();
        if(!changed.meta.changes) return reply({error:'انتهى وقت التصويت.'},409);
      }
    }

    return reply({ ok: true, ideaId, community: await visibleCommunity(db,user.userId,new URL(request.url).searchParams,ideaId) });
  } catch (error) {
    console.error('Community save', error);
    return reply({ error: 'ما تأكدنا من الحفظ. كلامك موجود؛ جرّب مرة ثانية ولن تتكرر المشاركة.' }, 503);
  }
}
