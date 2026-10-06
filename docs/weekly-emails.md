# Weekly congratulations

After each published weekly challenge closes, freeze the leaderboard first and
then send the approved Arabic congratulations to verified account owners whose
final rank is 1, 2 or 3 and whose score is positive. Everyone tied at an eligible
rank receives the same placement. Each message is addressed individually.

The first eligible close is 14 October 2026 at 00:00 Riyadh (13 October 21:00 UTC).
The September 30 test round is retired. Its sent-email receipts remain recorded for duplicate protection; pending test deliveries are skipped and never re-queued. Previously completed challenges are not backfilled. This programme follows the
actual published `weeklyChallenges` schedule; new challenges must continue to be
added to that schedule.

## Production activation

Publish this commit through the existing `vorw/ibtkr` GitHub `main` release to the
Cloudflare Worker **ibtkr**. Preserve all current database and login bindings.
The two non-secret options are already set in `wrangler.json`:

| Variable | Configured value |
| --- | --- |
| `WEEKLY_EMAIL_ENABLED` | `true` |
| `WEEKLY_EMAIL_FROM` | `ابتكر <hello@auth.ibtkr.space>` |

In that Worker's **Settings → Variables and Secrets**, add these **secret**
bindings. Do not put them in `wrangler.json`, a GitHub commit or chat:

| Secret | Source and purpose |
| --- | --- |
| `RESEND_API_KEY` | A Resend sending API key restricted to the verified `auth.ibtkr.space` domain. |
| `SUPABASE_SECRET_KEY` | A Supabase `sb_secret_…` key for project `zsdfbigxaqaehqmxhaqe`; used only by the scheduled server handler to look up a winner's confirmed account email. |

The sending domain must show **Verified** in Resend before activation. SMTP
credentials already used by Supabase login emails do not automatically become
Cloudflare Worker bindings. No frontend code receives these secrets.

For an authenticated local Wrangler setup, the equivalent commands are:

```sh
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put SUPABASE_SECRET_KEY
```

The Worker applies additive migration `0004_weekly_email_deliveries.sql` before
queuing messages on a GitHub-only release. The five-minute cron includes the
existing Tuesday 21:00 UTC close and recovers pending messages in batches of five.
For an ordinary three-person leaderboard, the first batch sends all three.
Large groups of tied winners continue in subsequent batches. Pausing sending
with `WEEKLY_EMAIL_ENABLED=false` does not affect finalization, accounts or posts.

## Delivery guarantees and recovery

- Finalized results, not live scores, choose the recipients and likes totals.
- Names, placement, challenge title and Riyadh dates fill the approved template.
  Both HTML and plain text are sent. Names are escaped and header controls removed.
- Account IDs are resolved through Supabase Auth Admin; unconfirmed, anonymous,
  deleted or banned accounts are skipped. No email is inferred from a name.
- A `(challenge_id,user_id)` primary key and an atomic lease prevent duplicate
  jobs and concurrent claims. The exact request body is frozen before sending.
- Resend receives a stable `Idempotency-Key`. Ambiguous failures reuse the same
  body and key, including if the provider accepts a message but the D1 receipt
  cannot be recorded. Automatic retries stop after 22 hours, before Resend's
  24-hour deduplication window expires. `sent` means the provider accepted it;
  inbox delivery/bounce status remains in Resend.
- An email address change, permanent rejection or expired ambiguous retry moves
  the job to `needs_review`; do not blindly reset it. Check the matching Resend
  request first. If it was accepted, record its provider ID as sent. Only reset
  a job after confirming it was never accepted.
- Missing credentials fail the scheduled job visibly while preserving pending
  jobs and finalized results. Correct the secret bindings to resume.
- Recipient addresses and payloads stay in the private outbox. Public community
  responses do not query or expose it. Logs contain batch counts and safe codes.
- The email link selects its archived week via `?view=leaderboard&week=…`, including
  after sign-in. It never silently substitutes the next week's live leaderboard.

Read-only health check (without exposing recipient addresses):

```sql
SELECT challenge_id,status,COUNT(*) AS messages
FROM weekly_email_deliveries
GROUP BY challenge_id,status;
```

## Validation

`pnpm test:weekly-email` checks frozen selection, sum across angles, ties, zero
likes, concurrency, retry payload stability, interrupted receipts, expired
leases, ambiguous retry cutoff, verified recipient resolution, email changes,
permanent provider failures, 105 recipients, escaping and archived links.
Run the existing community/auth suites, TypeScript and production build too.

Reference: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Supabase admin user lookup](https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid),
[Cloudflare cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
