# Weekly challenge programme

## Participant flow

- The main tab is **تحدّي الأسبوع**, replacing **البداية**. The tasks tab and three-problem selector are removed.
- One problem has **غيّر القاعدة**, **اقلب الفكرة**, and **ماذا لو؟**. Each angle has its own prompt and hint, all addressing the same problem.
- A participant can submit multiple independent solutions, choose an angle for every entry, and edit their entries or change the angle while the week is open.
- Voting is one like per other participant’s idea. Participants cannot like their own entries. Likes across all entries are summed for the participant’s weekly score.
- Ranking uses shared ranks for equal scores. All first-place participants with at least one like are weekly winners; zero likes do not create a winner.
- Closed weeks preserve their result. Creating, editing and changing votes are locked; archive discussion remains available.
- Lifetime XP is separate: 20 XP for the first participation in a week and 5 XP for the first comment on each other participant’s idea, preserving previous progress.

## Schedule

The close is Tuesday 11:59 PM Riyadh. Technically the end boundary is exclusive Wednesday 00:00 Riyadh / Tuesday 21:00 UTC. The next scheduled week becomes active at that boundary. The Worker cron at `0 21 * * TUE` finalizes completed weeks; API reads provide an idempotent fallback if a cron is delayed.

The reviewed schedule currently contains:

| Challenge | Riyadh start | Riyadh end (exclusive) |
| --- | --- | --- |
| Waiting differently | 30 September 2026, 00:00 | 7 October 2026, 00:00 |
| Clear subscription cancellation | 7 October 2026, 00:00 | 14 October 2026, 00:00 |
| Arriving alone at an event | 14 October 2026, 00:00 | 21 October 2026, 00:00 |

Content lives in `lib/weekly.ts`. Add reviewed future problems before their start; never recycle identifiers or alter past weeks. Each problem must have three unique angle IDs and nonoverlapping UTC dates. If the schedule runs out, the home shows a waiting state and past results remain available. It does not reuse a closed problem.

## Community organization

The community uses 12-entry pages, search across title/body/author, week and angle filters, newest/most-liked sorting, and an all/my-participations switch. Rankings use 20-participant pages; discussions use 20-comment pages. Individual saved ideas can be opened even when they are outside the visible filtered page. This replaces the former latest-100 limit.

Previous `queue`, `reverse` and `alone` entries remain in the archive. They retain comments, likes and ownership, but are excluded from the weekly competition. Matching old local drafts resume in the corresponding weekly angle and are only cleared after a confirmed save.

## Data and release

`drizzle/0002_weekly_challenges.sql` adds the angle field, feed indexes, frozen weekly results and finalization markers. It does not delete or reassign existing data. Finalization inserts rankings and the marker in one transactional D1 batch and is repeat-safe. Server-side clock guards prevent late entry/edit/vote writes even if the client remains open at the cutoff.

The production target is the existing Cloudflare Worker `ibtkr`, D1 `ibtkr-community` and domain `ibtkr.space`, connected to GitHub `main`. Do not deploy to the former Sites project.

Merge the verified GitHub release to `main` to use the existing connected Cloudflare build. `ensureWeeklySchema` imports the real 0002 SQL migration, applies it in a transactional D1 batch before weekly queries, and records it in the standard Wrangler migration ledger. Already-applied schema and concurrent first requests are handled safely. A failed upgrade rolls back and remains retryable. Existing data is neither deleted nor reassigned.

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

The isolated SQLite tests use the real migrations and route handlers. They cover multi-angle submissions, ownership, retry recovery, deadline enforcement, vote uniqueness, cumulative scores and ties, archive preservation, 126-entry pagination, 140-participant rankings, 55-comment pagination, frozen results and exact Riyadh week rollover. No production accounts or data are used.

Visual browser QA is pending: the managed browser-control skill was unavailable. Check desktop and mobile, light and dark themes, navigation transitions, angle selection, composer recovery, filters/pages, voting, ranking and archive states before announcing the release.

## Platform references

- [D1 batch execution](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
- [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
