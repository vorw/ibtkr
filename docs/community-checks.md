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
| `packaging` | Hidden tasks, 120-second timer, two skips, refresh recovery and separate review storage |
| `committee-review` | Pinned week, original rankings, closed writes and paused background work |
| `maintenance` | Active-time boundaries, API blocking and automatic expiry |
| Audio/prototype/identity checks | Unpitched sound, isolated experiments and shared visual structure |

Normal-mode suites replace the temporary review configuration with an inactive fixture. The dedicated review suite uses the actual review configuration. This keeps a temporary deployment setting from changing what the normal-mode tests are testing.

## Static and build checks

```sh
pnpm exec tsc --noEmit
pnpm build
```

A build checks packaging; it does not prove that production service bindings or email delivery are healthy. Some UI tests inspect source structure, so a large presentation refactor may need corresponding test maintenance.

## Manual review

Use phone and desktop layouts, both themes and reduced motion. Check navigation, readable Arabic alignment, challenge selection, timer reveal, drawing tools, normal sign-in, saved images, filters, archive selection and tied rankings.

In the current committee review, check that the original week 05 leaderboard appears and publishing/voting remain closed. Do not use real student accounts to create test submissions or manually trigger winner messages.

For future normal-mode write testing, use a separate development database and test accounts. Maintain the production migration ledger and keep the live dataset out of fixtures and screenshots.
