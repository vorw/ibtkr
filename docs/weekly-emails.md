# Weekly congratulations

## Current status

Committee review is active. `worker.ts` returns before running the scheduled weekly job, so this review does not enqueue or send congratulations. This is independent of the non-secret `WEEKLY_EMAIL_ENABLED` option in `wrangler.json`.

This guide explains the normal pipeline. It does not assert that production secrets are currently bound or that a particular message has been sent.

## How normal sending works

1. Freeze a closed week's leaderboard.
2. Select participants with a **frozen rank of 1, 2 or 3 and positive likes**, including ties.
3. Insert one outbox row per `(challenge_id, user_id)`.
4. Resolve that account's confirmed email through Supabase Auth on the server.
5. Send an individual Arabic congratulations through Resend and save the provider receipt.

`WEEKLY_EMAIL_START` is derived from `weeklyChallenges[0].endsAt`. In the current schedule, that is **17 October 2026 at 00:00 Riyadh**. Retired pre-launch rounds are not eligible. Do not copy a date from an old release note into the sending code.

The normal Worker cron runs every five minutes. It handles at most five delivery candidates per batch. Large groups of tied winners continue in later batches. Do not add a parallel manual sender for the same winners.

## Configuration

| Value | Where it belongs | Purpose |
| --- | --- | --- |
| `WEEKLY_EMAIL_ENABLED` | Non-secret Worker configuration | Enables the email job during normal operation |
| `WEEKLY_EMAIL_FROM` | Non-secret Worker configuration | Verified sender identity |
| `SUPABASE_URL` | Non-secret Worker configuration | Identifies the account service |
| `RESEND_API_KEY` | Worker secret binding | Authorizes email sending |
| `SUPABASE_SECRET_KEY` | Worker secret binding | Resolves verified recipient emails on the server |

Supabase login SMTP settings are separate from Worker secret bindings. Neither server secret belongs in a commit, frontend bundle or shared handover document. The configured sender uses the `auth.ibtkr.space` domain. An operator must verify the actual provider/domain/binding state before resuming sending.

## Repeat protection and retries

- Frozen results choose recipients. Display names are never treated as email addresses.
- A database primary key prevents duplicate week/account jobs. An atomic lease prevents two workers claiming the same job.
- The first request payload and a stable Resend idempotency key are reused after an ambiguous failure.
- Automatic retries stop after 22 hours. Expired or permanently rejected work moves to `needs_review`.
- Missing credentials preserve the pending work and raise a safe configuration error.
- Outbox recipient addresses and payloads are private. Public community responses do not return them.

Do not reset an ambiguous job blindly. Check the matching provider request before deciding whether a retry is safe.

## What a delivery status proves

| Evidence | What it means |
| --- | --- |
| Outbox `pending` / `sending` | Work is waiting or claimed. It is not proof of acceptance. |
| Outbox `sent` with provider ID | The provider accepted the request. |
| Provider `delivered` event | The receiving mail server accepted delivery. |
| Inbox placement | Not established by provider acceptance or delivery alone. |

The repository's `sent` status must not be described as proof that someone saw the message in their inbox.

A safe operator summary can group rows without returning addresses:

```sql
SELECT challenge_id, status, COUNT(*) AS messages
FROM weekly_email_deliveries
GROUP BY challenge_id, status;
```

The email template is in `lib/weekly-email-template.ts` and `lib/weekly-email-html.ts`. It escapes participant text and links back to the correct archived week. The isolated email tests use mocked transport and do not send real messages.
