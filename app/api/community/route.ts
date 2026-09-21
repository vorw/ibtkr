import { getParticipant } from '@/lib/auth-server';
import { database } from '@/lib/database';
import { challenges, type AppData, type Comment, type Idea } from '@/lib/challenges';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
});
type IdeaRow = Omit<Idea, 'isOwn' | 'liked' | 'comments'> & { user_id: string; liked: number };
type CommentRow = Omit<Comment, 'isOwn'> & { user_id: string; idea_id: string };

async function readCommunity(userId: string): Promise<AppData> {
  const db = database();
  const [ideas, comments, own, reviews] = await Promise.all([
    db.prepare('SELECT i.*, (SELECT COUNT(*) FROM reactions r WHERE r.idea_id=i.id AND r.liked=1) likes, (SELECT COUNT(*) FROM reactions r WHERE r.idea_id=i.id AND r.user_id=? AND r.liked=1) liked FROM ideas i WHERE i.id IN (SELECT id FROM ideas ORDER BY created_at DESC, id DESC LIMIT 100) OR i.user_id=? ORDER BY i.created_at DESC, i.id DESC').bind(userId, userId).all<IdeaRow>(),
    db.prepare('SELECT * FROM comments WHERE idea_id IN (SELECT id FROM ideas ORDER BY created_at DESC, id DESC LIMIT 100) OR idea_id IN (SELECT id FROM ideas WHERE user_id=?) ORDER BY created_at ASC, id ASC').bind(userId).all<CommentRow>(),
    db.prepare('SELECT COUNT(*) total, COUNT(DISTINCT challenge_id) rewarded FROM ideas WHERE user_id=?').bind(userId).first<{ total: number; rewarded: number }>(),
    db.prepare('SELECT COUNT(DISTINCT c.idea_id) total FROM comments c JOIN ideas i ON c.idea_id=i.id WHERE c.user_id=? AND i.user_id<>?').bind(userId, userId).first<{ total: number }>(),
  ]);
  const discussions = new Map<string, Comment[]>();
  for (const { user_id, idea_id, ...comment } of comments.results) {
    const entries = discussions.get(idea_id) ?? [];
    entries.push({ ...comment, isOwn: user_id === userId });
    discussions.set(idea_id, entries);
  }
  return {
    signedIn: true,
    ideas: ideas.results.map(({ user_id, liked, ...idea }) => ({ ...idea, isOwn: user_id === userId, liked: Boolean(liked), comments: discussions.get(idea.id) ?? [] })),
    progress: { ideas: own?.total ?? 0, reviews: reviews?.total ?? 0, xp: (own?.rewarded ?? 0) * 20 + (reviews?.total ?? 0) * 5 },
  };
}

export async function GET(request: Request) {
  try {
    const user = await getParticipant(request);
    if (!user) return reply({ signedIn: false, ideas: [], progress: { xp: 0, ideas: 0, reviews: 0 } });
    return reply(await readCommunity(user.userId));
  } catch (error) {
    console.error('Community load', error);
    return reply({ error: 'ما قدرنا نحمّل المشاركات. جرّب مرة ثانية.' }, 503);
  }
}

const common = { id: z.string().uuid(), name: z.string().trim().min(1).max(40) };
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('idea'), ...common, challengeId: z.string(), title: z.string().trim().min(2).max(100), body: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal('edit'), ...common, title: z.string().trim().min(2).max(100), body: z.string().trim().min(10).max(2000) }),
  z.object({ action: z.literal('comment'), ...common, ideaId: z.string().uuid(), body: z.string().trim().min(5).max(1000) }),
  z.object({ action: z.literal('react'), ideaId: z.string().uuid(), liked: z.boolean() }),
]);

export async function POST(request: Request) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'طلب غير مسموح.' }, 403);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return reply({ error: 'طلب غير مسموح.' }, 403);
    const user = await getParticipant(request);
    if (!user) return reply({ error: 'سجّل دخولك عشان تحفظ مشاركتك. مسودتك باقية.' }, 401);
    const raw = await request.text();
    if (raw.length > 12000) return reply({ error: 'المشاركة طويلة جدًا.' }, 413);
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return reply({ error: 'صيغة المشاركة غير صالحة.' }, 400); }
    const parsed = schema.safeParse(json);
    if (!parsed.success) return reply({ error: 'تأكد من الاسم والعنوان والمشاركة، ثم جرّب ثانية.' }, 400);
    const value = parsed.data;
    const db = database();
    const now = new Date().toISOString();
    let ideaId: string;

    if (value.action === 'idea') {
      ideaId = value.id;
      if (!challenges.some(challenge => challenge.id === value.challengeId)) return reply({ error: 'المهمة غير موجودة.' }, 404);
      await db.prepare('INSERT INTO ideas (id,user_id,challenge_id,name,title,body,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
        .bind(value.id, user.userId, value.challengeId, value.name, value.title, value.body, now).run();
      // Retrying an ID is safe only when it refers to the exact same participation.
      const saved = await db.prepare('SELECT user_id,challenge_id,name,title,body FROM ideas WHERE id=?').bind(value.id).first<IdeaRow>();
      if (!saved || saved.user_id !== user.userId || saved.challenge_id !== value.challengeId || saved.name !== value.name || saved.title !== value.title || saved.body !== value.body) {
        return reply({ error: 'سبق حفظ نسخة مختلفة من هذه المسودة. افتحها من أفكارك لتطويرها.' }, 409);
      }
    } else if (value.action === 'edit') {
      ideaId = value.id;
      const row = await db.prepare('SELECT user_id FROM ideas WHERE id=?').bind(value.id).first<{ user_id: string }>();
      if (!row) return reply({ error: 'الفكرة غير موجودة.' }, 404);
      if (row.user_id !== user.userId) return reply({ error: 'تقدر تعدّل فكرتك أنت فقط.' }, 403);
      await db.prepare('UPDATE ideas SET name=?,title=?,body=? WHERE id=? AND user_id=?').bind(value.name, value.title, value.body, value.id, user.userId).run();
    } else {
      ideaId = value.ideaId;
      const row = await db.prepare('SELECT user_id FROM ideas WHERE id=?').bind(value.ideaId).first<{ user_id: string }>();
      if (!row) return reply({ error: 'الفكرة غير موجودة.' }, 404);
      if (value.action === 'comment') {
        await db.prepare('INSERT INTO comments (id,idea_id,user_id,name,body,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
          .bind(value.id, value.ideaId, user.userId, value.name, value.body, now).run();
        const saved = await db.prepare('SELECT user_id,idea_id,name,body FROM comments WHERE id=?').bind(value.id).first<CommentRow>();
        if (!saved || saved.user_id !== user.userId || saved.idea_id !== value.ideaId || saved.name !== value.name || saved.body !== value.body) {
          return reply({ error: 'سبق حفظ تعليق مختلف من هذه المسودة. راجع النقاش قبل الإرسال مجددًا.' }, 409);
        }
      } else {
        if (row.user_id === user.userId) return reply({ error: 'خلّ التشجيع للأفكار الثانية.' }, 400);
        await db.prepare('INSERT INTO reactions (idea_id,user_id,liked) VALUES (?,?,?) ON CONFLICT(idea_id,user_id) DO UPDATE SET liked=excluded.liked')
          .bind(value.ideaId, user.userId, value.liked ? 1 : 0).run();
      }
    }
    // Show the confirmed save without relying on a second client fetch succeeding.
    return reply({ ok: true, ideaId, community: await readCommunity(user.userId) });
  } catch (error) {
    console.error('Community save', error);
    return reply({ error: 'ما تأكدنا من الحفظ. كلامك موجود؛ جرّب مرة ثانية ولن تتكرر المشاركة.' }, 503);
  }
}
