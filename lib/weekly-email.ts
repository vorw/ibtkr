import { createClient } from '@supabase/supabase-js';
import { weeklyChallenges, findWeek } from './weekly';
import { ensureWeeklyEmailSchema } from './weekly-email-schema';
import { renderWeeklyEmail, type WeeklyEmailResult } from './weekly-email-template';

// First close after the programme was approved; do not mail historical results.
export const WEEKLY_EMAIL_START = '2026-10-06T21:00:00.000Z';
const RETRY_WINDOW = 22 * 60 * 60 * 1000;
const BATCH_SIZE = 5;
type Payload = { from: string; to: string[]; subject: string; html: string; text: string };
type Delivery = WeeklyEmailResult & {
  challenge_id: string; payload_json: string | null; attempts: number;
  first_attempt_at: string | null; lease_token: string;
};
export type WeeklyEmailEnv = {
  DB: D1Database; WEEKLY_EMAIL_ENABLED?: string; WEEKLY_EMAIL_FROM?: string;
  RESEND_API_KEY?: string; SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string;
};
export type WeeklyMailer = {
  from: string;
  recipient: (userId: string) => Promise<string | null>;
  send: (payload: Payload, idempotencyKey: string) => Promise<string>;
  pause?: () => Promise<void>;
};
export class WeeklyEmailError extends Error {
  code: string;
  permanent: boolean;
  constructor(code: string, permanent = false) { super(code); this.code = code; this.permanent = permanent; }
}

export function createWeeklyMailer(env: WeeklyEmailEnv, transport: typeof fetch = fetch): WeeklyMailer {
  if (!env.RESEND_API_KEY?.startsWith('re_') || !env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_') ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(env.SUPABASE_URL ?? '') ||
      !/^ابتكر <[a-z0-9._+-]+@auth\.ibtkr\.space>$/.test(env.WEEKLY_EMAIL_FROM ?? '')) {
    throw new WeeklyEmailError('email_configuration_missing', true);
  }
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => transport(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  return {
    from: env.WEEKLY_EMAIL_FROM!,
    async recipient(userId) {
      const match = /^supabase:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(userId);
      if (!match) return null;
      const { data, error } = await client.auth.admin.getUserById(match[1]);
      if (error) {
        if (error.status === 404) return null;
        throw new WeeklyEmailError('identity_lookup_failed', error.status === 401 || error.status === 403);
      }
      const user = data.user;
      if (user?.id !== match[1] || !user.email_confirmed_at || user.is_anonymous ||
          (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) ||
          !user.email || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(user.email)) return null;
      return user.email;
    },
    async send(payload, idempotencyKey) {
      let response: Response;
      try {
        response = await transport('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(payload),
        });
      } catch { throw new WeeklyEmailError('email_transport_unknown'); }
      if (!response.ok) throw new WeeklyEmailError(`email_http_${response.status}`, response.status >= 400 && response.status < 500 && response.status !== 429 && response.status !== 408);
      const body = await response.json().catch(() => null) as { id?: unknown } | null;
      if (typeof body?.id !== 'string' || !body.id) throw new WeeklyEmailError('email_response_unknown');
      return body.id;
    },
    // Resend's default account rate is two requests per second. Keep this batch serial.
    pause: () => new Promise(resolve => setTimeout(resolve, 600)),
  };
}

export async function enqueueWeeklyEmails(db: D1Database, now = new Date()) {
  const time = now.toISOString();
  const closed=weeklyChallenges.filter(week => week.endsAt >= WEEKLY_EMAIL_START && week.endsAt <= time);
  if(closed.length){
    // Recipient set is tied to frozen results, never the live score or a client request.
    await db.prepare(`INSERT OR IGNORE INTO weekly_email_deliveries
      (challenge_id,user_id,name,likes,entries,rank,next_attempt_at,created_at)
      SELECT r.challenge_id,r.user_id,r.name,r.likes,r.entries,r.rank,?,?
      FROM weekly_results r JOIN finalized_weeks f ON f.challenge_id=r.challenge_id
      WHERE r.challenge_id IN (${closed.map(()=>'?').join(',')}) AND r.rank BETWEEN 1 AND 3 AND r.likes>0`)
      .bind(time, time, ...closed.map(week=>week.id)).run();
  }
}

export async function processWeeklyEmails(db: D1Database, mailer: WeeklyMailer, now = new Date()) {
  const started = Date.now();
  const time = now.toISOString();
  const expired = new Date(now.getTime() - RETRY_WINDOW).toISOString();
  await db.prepare(`UPDATE weekly_email_deliveries SET status='needs_review',last_error_code='retry_window_expired',lease_token=NULL,lease_until=NULL
    WHERE status IN ('pending','sending') AND first_attempt_at IS NOT NULL AND first_attempt_at<=?
    AND (lease_until IS NULL OR lease_until<=?)`).bind(expired, time).run();
  const candidates = (await db.prepare(`SELECT challenge_id,user_id FROM weekly_email_deliveries
    WHERE status IN ('pending','sending') AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?)
    ORDER BY created_at,rank,user_id LIMIT ?`).bind(time, time, BATCH_SIZE).all<{ challenge_id: string; user_id: string }>()).results;
  const summary = { sent: 0, skipped: 0, retry: 0, needsReview: 0 };
  for (const candidate of candidates) {
    const claimTime = new Date(now.getTime() + Date.now() - started);
    const time = claimTime.toISOString();
    const lease = crypto.randomUUID();
    const job = await db.prepare(`UPDATE weekly_email_deliveries SET status='sending',lease_token=?,lease_until=?,attempts=attempts+1
      WHERE challenge_id=? AND user_id=? AND status IN ('pending','sending') AND next_attempt_at<=?
      AND (lease_until IS NULL OR lease_until<=?) RETURNING *`)
      .bind(lease, new Date(claimTime.getTime() + 120000).toISOString(), candidate.challenge_id, candidate.user_id, time, time).first<Delivery>();
    if (!job) continue;
    let providerAccepted = false;
    try {
      const week = findWeek(job.challenge_id);
      if (!week || week.endsAt > time) throw new WeeklyEmailError('week_not_closed', true);
      if(job.first_attempt_at && claimTime.getTime()-new Date(job.first_attempt_at).getTime()>=RETRY_WINDOW) throw new WeeklyEmailError('retry_window_expired',true);
      const email = await mailer.recipient(job.user_id);
      if (!email) {
        await db.prepare(`UPDATE weekly_email_deliveries SET status='skipped',last_error_code='no_eligible_verified_account',lease_token=NULL,lease_until=NULL
          WHERE challenge_id=? AND user_id=? AND lease_token=?`).bind(job.challenge_id, job.user_id, lease).run();
        summary.skipped++; continue;
      }
      let payload: Payload;
      if (job.payload_json) {
        payload = JSON.parse(job.payload_json) as Payload;
        // Never resend a frozen payload to an old address after an account email change.
        if (payload.to.length !== 1 || payload.to[0] !== email) throw new WeeklyEmailError('recipient_changed', true);
      } else {
        payload = { from: mailer.from, to: [email], ...renderWeeklyEmail(week, job) };
        const frozen = await db.prepare(`UPDATE weekly_email_deliveries SET payload_json=?,first_attempt_at=?
          WHERE challenge_id=? AND user_id=? AND lease_token=? RETURNING user_id`)
          .bind(JSON.stringify(payload), time, job.challenge_id, job.user_id, lease).first();
        if (!frozen) continue;
      }
      const key = `weekly-congrats/${job.challenge_id}/${job.user_id}`;
      const providerId = await mailer.send(payload, key);
      providerAccepted = true;
      await db.prepare(`UPDATE weekly_email_deliveries SET status='sent',provider_id=?,sent_at=?,last_error_code=NULL,lease_token=NULL,lease_until=NULL
        WHERE challenge_id=? AND user_id=? AND lease_token=?`).bind(providerId, time, job.challenge_id, job.user_id, lease).run();
      summary.sent++;
    } catch (error) {
      const known = error instanceof WeeklyEmailError;
      const permanent = known && error.permanent;
      const code = providerAccepted ? 'accepted_status_write_failed' : known ? error.code : 'delivery_temporarily_unavailable';
      const retryAt = new Date(claimTime.getTime() + Math.min(3600000, 300000 * 2 ** Math.min(job.attempts - 1, 4))).toISOString();
      // Freeze the payload before the first request, retry the same key inside
      // Resend's 24-hour window, and stop at 22 hours if acceptance is unknown.
      await db.prepare(`UPDATE weekly_email_deliveries SET status=?,next_attempt_at=?,last_error_code=?,lease_token=NULL,lease_until=NULL
        WHERE challenge_id=? AND user_id=? AND lease_token=?`)
        .bind(permanent ? 'needs_review' : 'pending', retryAt, code, job.challenge_id, job.user_id, lease).run();
      if (permanent) summary.needsReview++; else summary.retry++;
    }
    if (mailer.pause) await mailer.pause();
  }
  return summary;
}

export async function runWeeklyEmailJob(env: WeeklyEmailEnv, now = new Date()) {
  if (env.WEEKLY_EMAIL_ENABLED !== 'true') return;
  await ensureWeeklyEmailSchema(env.DB);
  await enqueueWeeklyEmails(env.DB, now);
  const due = await env.DB.prepare(`SELECT user_id FROM weekly_email_deliveries
    WHERE status IN ('pending','sending') AND next_attempt_at<=? LIMIT 1`).bind(now.toISOString()).first();
  if (!due) return;
  const summary = await processWeeklyEmails(env.DB, createWeeklyMailer(env), now);
  // Counts only: never log recipient email addresses, keys, or message bodies.
  console.log('weekly_email_batch', summary);
}
