# ابتكر — ibtkr.space

Arabic weekly innovation programme for the FTC Innovation Committee, independently hosted on Cloudflare Workers with D1 community data and Supabase email-code authentication.

## Weekly programme

One active problem has three angles. Participants can publish multiple tagged solutions, edit them during the week, discuss ideas and like other participants’ solutions. The weekly ranking totals likes across each participant’s entries; lifetime XP remains separate. Voting and submissions close at Tuesday 11:59 PM Riyadh time. Wednesday starts the next scheduled challenge.

See [weekly programme and release notes](docs/weekly-program.md) and [verification](docs/community-checks.md).

## Status

This release is verified with automated authentication/community checks, TypeScript and a production build. Confirm deployment status and the live domain after a GitHub release. Visual browser QA and production sign-in checks complement the isolated automated suite.

## Development

Use Node 24 and pnpm. Install with `pnpm install --frozen-lockfile`.

```sh
pnpm exec wrangler d1 migrations apply DB --local
pnpm dev
pnpm test:community
pnpm test:auth
pnpm exec tsc --noEmit
pnpm build
```

Local configuration overrides can be placed in ignored `.dev.vars`. Runtime public configuration contains only the Supabase project URL, publishable key and Turnstile site key. The server verifies authenticated requests with Supabase `getUser`, ignores client identity headers and uses `supabase:<uuid>` ownership IDs. Never add service-role keys, SMTP passwords or Turnstile secrets to source.

## Production release

The existing target is Cloudflare Worker `ibtkr`, D1 database `ibtkr-community`, and custom domain `ibtkr.space`. Preserve the configured binding and database ID in `wrangler.json`. Do not publish this update to the former Sites hostname or recreate the production database.

Production is connected to the GitHub `main` branch. Merge a verified release into `main` to trigger the existing Cloudflare build. The Worker applies the additive weekly migration transactionally before its first weekly query or scheduled job, records migration 0002 for Wrangler, and applies the one-time user-authorized legacy cleanup 0003. The upgrade is repeat-safe across concurrent instances. An authenticated CLI release can also use `pnpm deploy`, which builds, applies pending remote migrations, then deploys. Verify the configured Tuesday 21:00 UTC cron, the live domain, authentication and mobile/desktop behavior after release.

The user requested a clean start after the weekly release. Migration 0003 deletes previous `queue`, `reverse` and `alone` posts and their comments, reactions and obsolete results. XP and achievements are recalculated from the remaining activity. Accounts, profile names and new weekly submissions remain intact. The reset is transactional and recorded once; old local drafts and drafts migrated from the previous programme are removed without clearing authentication or new weekly drafts.

## References

- [Email-code authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Server-side user validation](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Worker configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
