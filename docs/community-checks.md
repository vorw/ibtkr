# Testing and safe review

## Run the complete isolated suite

```sh
pnpm test
```

Use Node 24 after installing the declared dependencies. The suite uses in-memory SQLite, fixture identities, simulated clocks and mocked network responses. It does not need production Supabase, D1 or Resend credentials and does not send real emails.

| Test group | What it checks |
| --- | --- |
| `auth` | Remote identity verification, invalid/spoofed tokens and safe return URLs |
| `community` | Profile uniqueness, ownership, submissions, votes, comments, retries, pagination, cutoffs and frozen ranks |
| `drawing` | Image validation, account-protected reads and atomic drawing writes |
| `opening`, `weekly-opening` | Anonymous visitor cookies, repeat cuts, targets and concurrent opening |
| `weekly-email` | Eligible frozen ranks, positive likes, ties, leases, retry safety and templates |
| `packaging` | Hidden tasks, 120-second timer, two skips, refresh recovery and the real weekly deadline |
| `maintenance` | Manual switch, API blocking, asset allowlist and paused background work |
| Audio/identity checks | Unpitched ribbon sound, shared structure and absence of retired prototype routes |

## Static and build checks

```sh
pnpm exec tsc --noEmit
pnpm build
```

A build checks packaging; it does not prove that production service bindings or email delivery are healthy. Some UI tests inspect source structure, so a large presentation refactor may need corresponding test maintenance.

## Manual review

Use phone and desktop layouts, both themes and reduced motion. Check navigation, readable Arabic alignment, challenge selection, timer reveal, drawing tools, normal sign-in, saved images, filters, archive selection and tied rankings.

During live maintenance, verify the branded page and API 503 responses without submitting data. Use a development database for interactive challenge checks. Do not create test submissions in production or manually trigger winner messages.

For future normal-mode write testing, use a separate development database and test accounts. Maintain the production migration ledger and keep the live dataset out of fixtures and screenshots.
