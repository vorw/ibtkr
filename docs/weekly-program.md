# Weekly challenge programme

## Participant flow

- The main tab is **تحدّي الأسبوع**, replacing **البداية**. The tasks tab and three-problem selector are removed.
- One problem has **غيّر القاعدة**, **اقلب الفكرة**, and **ماذا لو؟**. Each angle has its own prompt and hint, all addressing the same problem.
- A participant can submit multiple independent solutions, choose an angle for every entry, and edit their entries or change the angle while the week is open.
- Voting is one like per other participant’s idea. Participants cannot like their own entries. Likes across all entries are summed for the participant’s weekly score.
- Ranking uses shared ranks for equal scores. All first-place participants with at least one like are weekly winners; zero likes do not create a winner.
- Closed weeks preserve their result. Creating, editing and changing votes are locked; archive discussion remains available.
- Lifetime XP is separate: 20 XP for the first participation in a week and 5 XP for the first comment on each other participant’s idea, excluding reset legacy participation.

## Schedule

The close is Tuesday 11:59 PM Riyadh. Technically the end boundary is exclusive Wednesday 00:00 Riyadh / Tuesday 21:00 UTC. The next scheduled week becomes active at that boundary. The Worker cron at `*/5 * * * *` includes that exact close, finalizes completed weeks and processes weekly congratulations; API reads provide an idempotent finalization fallback if a cron is delayed. See [weekly emails](weekly-emails.md) for activation, delivery rules and recovery.

The official launch schedule starts at **week 01** and includes **20 weeks**, from 7 October 2026 through the final close on 24 February 2027 (Riyadh time). Each has three distinct prompts and hints. The original two upcoming challenges are retained and 18 more are defined in `lib/weekly-content.ts`.

| Challenge | Riyadh start | Riyadh end (exclusive) |
| --- | --- | --- |
| Clear subscription cancellation | 7 October 2026, 00:00 | 14 October 2026, 00:00 |
| Arriving alone at an event | 14 October 2026, 00:00 | 21 October 2026, 00:00 |

`lib/weekly.ts` combines the existing weeks and prepared content into a validated contiguous schedule. Add reviewed future problems before their start; never recycle identifiers or alter past weeks. Each problem must have three unique angle IDs and a seven-day interval beginning Wednesday midnight Riyadh. If this finite batch runs out, the home shows a waiting state and past results remain available. It does not reuse a closed problem.

At the deadline, an already-open homepage refreshes against the server clock and shows a dismissible notice linking to the closed week's results. The new problem appears with no angle selected. An open composer for the closed week is dismissed, and its local draft stays attached to that week rather than being submitted to the new challenge. Requests made after the deadline are rejected by the server. Each week starts with its own participation and likes; accounts, official archived entries and lifetime XP remain intact. The next week does not wait for email delivery. Frozen eligible results enter the email outbox and the five-minute scheduled job sends the approved individual congratulations with repeat protection.

## Community organization

The community uses 12-entry pages, search across title/body/author, week and angle filters, newest/most-liked sorting, and an all/my-participations switch. Rankings use 20-participant pages; discussions use 20-comment pages. Individual saved ideas can be opened even when they are outside the visible filtered page. This replaces the former latest-100 limit.

The user requested removal of previous `queue`, `reverse` and `alone` participation. Migration 0003 removes those posts, their comments/likes and obsolete results in one guarded transaction, then records the reset in the migration ledger. Profiles, auth accounts, new weekly posts and their rewards remain intact. Old and previously migrated local drafts are cleared without clearing login tokens. The obsolete previous-programme filter is removed; completed weekly archives remain available.

## Data and release

`drizzle/0002_weekly_challenges.sql` adds the angle field, feed indexes, frozen weekly results and finalization markers. It does not delete or reassign existing data. Finalization inserts rankings and the marker in one transactional D1 batch and is repeat-safe. Server-side clock guards prevent late entry/edit/vote writes even if the client remains open at the cutoff.

The production target is the existing Cloudflare Worker `ibtkr`, D1 `ibtkr-community` and domain `ibtkr.space`, connected to GitHub `main`. Do not deploy to the former Sites project.

Merge the verified GitHub release to `main` to use the existing connected Cloudflare build. `ensureWeeklySchema` imports the real 0002 SQL migration, applies it in a transactional D1 batch before weekly queries, and records it in the standard Wrangler migration ledger. Already-applied schema and concurrent first requests are handled safely. A failed upgrade rolls back and remains retryable. Migration 0003 then applies the user-authorized legacy reset, including on GitHub-only deployments. Its marker and deletions are atomic; failed resets roll back and retry, while concurrent instances cannot reset new weekly data.

An authenticated CLI release remains available:

```sh
pnpm install --frozen-lockfile
pnpm test:community
pnpm test:auth
pnpm exec tsc --noEmit
pnpm deploy
```

`pnpm deploy` builds, applies remote migrations and then deploys the Worker. The automatic Worker upgrade also covers deployments that only publish code. Confirm the scheduled handler and cron configuration after deployment. No deployment credentials are stored in source.

## Verification

The isolated SQLite tests use the real migrations and route handlers. They cover multi-angle submissions, ownership, retry recovery, deadline enforcement, vote uniqueness, cumulative scores and ties, account preservation and legacy cleanup, 126-entry pagination, 140-participant rankings, 55-comment pagination, frozen results and exact Riyadh week rollover. No production accounts or data are used.

The weekly release was verified on the live homepage, three-angle switching, challenge details, public rankings and guest community filters. Signed-in writes and account preservation are covered by the isolated automated suite. Mobile visual review remains a manual check.

## Platform references

- [D1 batch execution](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
- [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

## Official launch reset — 7 October 2026

The September 30 round was testing. Migration 0005 moves its ideas, comments, likes, rankings and finalization record into private `launch_test_archive_*` tables in a guarded atomic batch, then clears that round from active tables. Its activity no longer earns XP or appears in public archives. Profiles and authentication stay intact, and October 7 activity is preserved. The twenty existing prepared challenges keep their date IDs and boundaries but are numbered 01–20. Test drafts are cleared; official drafts and login sessions are retained. Sent test email receipts are kept, with no replay. Official congratulations start at the first real close, 14 October 2026 at 00:00 Riyadh.
