# ابتكر · IBTKR

A weekly innovation space for the **Future Technology Club at King Saud University**. Students explore a real-life problem, share a written idea or drawing, and encourage other contributions. Each challenge can have its own interaction and visual design.

**Live site:** [ibtkr.space](https://ibtkr.space/) · **Production branch:** `main`

## Start here

| If you want to… | Read… |
| --- | --- |
| Understand the project in Arabic | [دليل اللجنة التقنية](docs/START_HERE_AR.md) |
| Find the code for a feature | [Architecture and file map](docs/architecture.md) |
| Understand weekly dates, votes and rankings | [Weekly programme](docs/weekly-program.md) |
| Understand drawings and the timed packaging activity | [Drawing experiences](docs/drawings.md) |
| Plan the move into the club portal | [Portal handover](docs/portal-handoff.md) |
| Run checks safely | [Testing guide](docs/community-checks.md) |
| Review secrets and access boundaries | [Security and sharing](SECURITY.md) |

## Current review mode

The site is deliberately showing **week 05**, `week-2026-11-11`: **رسالة على علبة. يفهمها أي أحد.**

- Reviewers can try the two-minute drawing activity and browse the original leaderboard.
- Viewing community contributions and their images still requires normal sign-in.
- New submissions, edits, comments and vote changes are blocked. Profile setup and renaming remain available.
- The scheduled worker returns before processing results or sending winner emails.
- Review attempts use separate browser storage. Original challenge IDs, dates and stored results are unchanged.

The switch is `committeeReviewWeekId` in [`lib/committee-review.js`](lib/committee-review.js). Setting it to `null` resumes the real-time schedule. It does **not** rewind dates or automatically create a new maintenance window. The exam pause in `lib/maintenance.ts` ended on 21 November 2026 at 00:00 Riyadh.

## Technology, in plain language

| Part | Technology | Responsibility |
| --- | --- | --- |
| Interface | React, TypeScript, Vinext/Vite, Tailwind CSS | Arabic pages, forms, drawing tools and animations |
| Server | Cloudflare Workers | API requests and the scheduled weekly job |
| Application database | Cloudflare D1, with Drizzle schema/migrations | Profiles, ideas, drawings, comments, votes and frozen results |
| Sign-in | Supabase Auth | Email-code sign-in and server verification of accounts |
| Winner emails | Resend, called by the server | Individual congratulations selected from frozen results |

Supabase is the identity service. **The community database is D1.** Repository access does not automatically provide access to either production service.

## Run locally

Use Node 24 and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm exec wrangler d1 migrations apply DB --local
pnpm dev
```

Local development still needs appropriate Supabase/Turnstile configuration if you want real sign-in. Use a development project for write testing. Ignored `.dev.vars` files are for local secrets. No production database or email credentials are needed for the isolated test suite.

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

`pnpm test` runs every test file, including review mode, drawings, ribbons, emails and the timed activity. Tests use SQLite fixtures, simulated clocks and mocked network requests.

## Deployment boundary

**Pushing or merging to `main` starts the existing Cloudflare production build.** Repository review does not require a deployment. Use a separate branch for changes and validate them before merging.

The production Worker is `ibtkr`, its D1 binding is `DB`, and the live domain is `ibtkr.space`. Keep those resources intact during review. `pnpm deploy` is an operator command that applies **remote** migrations and deploys the Worker. It is not a local preview command.

Older migrations include one-time cleanup of pre-launch test activity. Their recorded history is part of the existing database. See the [data guide](docs/architecture.md#database-records) before planning a separate portal migration.
