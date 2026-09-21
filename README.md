# ابتكر — independent hosting

Arabic innovation platform for the FTC Innovation Committee. This migration preserves the design, light/dark themes and community features while replacing platform sign-in with email verification codes.

## Status

Prepared, not deployed. The existing production site and database are unchanged. All 21 authentication/community tests, TypeScript checking and the production build passed. Real email delivery, domain login and visual browser QA remain launch gates: the browser could not reach this environment's preview server.

## Setup

The source now points to the connected FTC Supabase project in organization IBTKR, verified on the Free plan. Its region is Seoul. Only its public URL and publishable key are configured; SMTP, email templates and CAPTCHA settings have not been changed through the connector.

Use Node 24 and pnpm. Install with `pnpm install --frozen-lockfile`.

1. Connect the owner's Cloudflare account and Supabase project. Start on free plans subject to their usage limits; unlimited free usage is not guaranteed.
2. Create Cloudflare D1 database `ibtkr-community`. Replace the placeholder database ID in `wrangler.json` with its real ID.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in that file. Use only the project's `sb_publishable_` key. Never add service-role keys, SMTP passwords or Turnstile secrets to source.
4. Enable Supabase email sign-in. Set the site URL to `https://ibtkr.space`. Replace the Magic Link email template with `deployment/email-otp.html`; the `{{ .Token }}` variable is essential. Configure a 10-minute OTP expiry and review rate limits.
5. Configure custom SMTP in Supabase with a transactional email provider. Verify a sending domain such as `auth.ibtkr.space` using the exact DNS records supplied by that provider. Suggested sender: `دخول ابتكر <login@auth.ibtkr.space>`. The default Supabase email service is for testing and is not sufficient for community launch.
6. Create a Turnstile widget for the final hostname. Set its public key in `TURNSTILE_SITE_KEY`; enter its secret in Supabase Auth CAPTCHA settings and enable Turnstile there.
7. Preserve existing data and verify ownership as described below. After checking the target Cloudflare account, run `pnpm deploy`. It builds, applies D1 migrations and deploys the Worker, rejecting missing configuration.
8. Add `ibtkr.space` as a Worker custom domain. If Cloudflare DNS is required, copy existing DNS records first, including mail-related MX/TXT records. Change GoDaddy nameservers only to the exact pair Cloudflare assigns. Do not guess DNS targets. The domain can remain registered at GoDaddy.
9. Test real email delivery and login on HTTPS with an owner-authorized address. Check wrong/expired codes, resend, logout, session refresh, unfinished-idea return, mobile layout and both themes. With two accounts, verify ideas, editing, deletion, comments, reactions and XP, including rejection of another user's edits and signed-out writes.
10. Keep the original site private as a rollback reference until the replacement is verified. No DNS or audience changes have been made.

## Development

```sh
pnpm exec wrangler d1 migrations apply DB --local
pnpm dev
pnpm test:community
pnpm test:auth
pnpm exec tsc --noEmit
pnpm build
```

Local configuration overrides can be placed in ignored `.dev.vars`. Runtime public configuration contains only the project URL, publishable key and Turnstile site key. The server verifies authenticated requests with Supabase `getUser`, ignores old identity headers, and uses `supabase:<uuid>` ownership IDs.

## Existing data

One existing idea was observed in the current production database on 21 September 2026. Comments and reactions still require an export check. Do not silently discard data or launch a blank replacement. Export all three tables through authorized database tools, retain a protected backup, and import records preserving IDs and timestamps.

Old ownership IDs cannot automatically match new email accounts. Never match using a display name. Reassign records only through verified ownership mapping; otherwise retain their original IDs until resolved. Preserve reaction uniqueness and verify XP after import. No live data is included in this source package or has been migrated.

Unsent browser-local drafts on the old hostname do not automatically transfer to the new hostname; retain a copy before switching.

## Future development

Keep this source in an owner-controlled private Git repository and connect it for future ChatGPT development. Hosting and visitor authentication remain independent of the development tool. Visitors will not need ChatGPT accounts. No external repository has been created or configured automatically.

## References

- [Email-code authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Production email delivery](https://supabase.com/docs/guides/auth/auth-smtp)
- [Server-side user validation](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Worker configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/)
