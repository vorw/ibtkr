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

## Current operating state

**Maintenance is enabled.** Visitors see a reusable Arabic maintenance screen. The Worker rejects application/API requests before accessing account data or D1, and the scheduled job returns without processing results or emails. Stored participation and results are retained.

The switch is `siteSettings.maintenance.enabled` in [`lib/site-settings.ts`](lib/site-settings.ts). Set it to `false`, validate and deploy to reopen on the actual weekly calendar. Email sending also has an independent safety switch, currently `WEEKLY_EMAIL_ENABLED: "false"` in `wrangler.json`. Read the [maintenance guide](docs/maintenance.md) before reopening.

The former committee-review pin, drawing previews, 3D prototype and hidden opening bypass have been removed from the current source. Earlier versions remain in Git history.

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

`pnpm test` runs every test file, including maintenance, drawings, ribbons, emails and the timed activity. Tests use SQLite fixtures, simulated clocks and mocked network requests.

## Deployment boundary

**Pushing or merging to `main` starts the existing Cloudflare production build.** Repository review does not require a deployment. Use a separate branch for changes and validate them before merging.

The production Worker is `ibtkr`, its D1 binding is `DB`, and the live domain is `ibtkr.space`. Keep those resources intact during review. `pnpm deploy` is an operator command that applies **remote** migrations and deploys the Worker. It is not a local preview command.

Older migrations include one-time cleanup of pre-launch test activity. Their recorded history is part of the existing database. See the [data guide](docs/architecture.md#database-records) before planning a separate portal migration.
