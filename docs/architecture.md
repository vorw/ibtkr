# Architecture and file map

This guide describes the current implementation. It separates presentation, account verification, application data and background work so a new maintainer can follow one feature at a time.

## Request flow

```mermaid
flowchart TD
  Browser[Arabic interface] --> Worker[Cloudflare Worker]
  Worker --> Auth[Supabase account verification]
  Worker --> Community[Community API]
  Community --> DB[Cloudflare D1]
  Cron[Five-minute scheduled job] --> Results[Freeze results and prepare emails]
  Results --> DB
  Results --> Resend[Resend acceptance]
```

During committee review, requests reach the normal site, but community writes other than profile setup/renaming are rejected. The scheduled job exits before doing any work. Authentication checks remain in place.

## Read the site in this order

1. `app/page.tsx` mounts the main interface in `app/innovation-app.tsx`.
2. `lib/weekly.ts` defines the calendar and content. `currentChallenge()` follows real time. `displayedChallenge()` can select the committee review week for presentation.
3. `app/api/community/route.ts` verifies the account, checks the operation and calls the database helpers.
4. `lib/community-read.ts` chooses a displayed/archive week, loads paged data and selects live or frozen ranking rows.
5. `lib/weekly-db.ts` totals genuine likes and saves closed-week rankings atomically.
6. `worker.ts` runs the five-minute background job when neither review nor maintenance blocks it.

## Feature map

| Feature | Main files | Important boundary |
| --- | --- | --- |
| Sign-in | `app/login/page.tsx`, `lib/auth-client.ts`, `lib/auth-server.ts` | The server verifies the token with Supabase. Browser-supplied account IDs are not trusted. |
| Main navigation and forms | `app/innovation-app.tsx` | The interface guides users, but server checks enforce ownership and deadlines. |
| Challenge content | `lib/weekly.ts`, `lib/weekly-content.ts` | Stable IDs link submissions, drafts, results and email records. |
| Text and warning-icon UI | `app/weekly-challenge-view.tsx`, `app/warning-challenge-visuals.tsx` | Shared challenge layout with theme-specific illustrations. |
| Timed packaging UI | `app/packaging-challenge.tsx`, `lib/packaging-game.ts` | The embedded drawing activity reports a result to the parent page. |
| Community reads | `lib/community-read.ts` | Contributions/images require sign-in. Rankings can be read by guests. |
| Contributions and votes | `app/api/community/route.ts` | Same-origin checks, validated input, ownership and database-clock cutoffs. |
| Drawing images | `lib/drawings.ts`, `lib/drawing-policy.ts`, `app/api/drawing/route.ts` | Small raster images, authenticated reads and no-store responses. |
| Opening ribbons | `lib/opening.ts`, `lib/weekly-opening.ts`, `app/opening-gate.tsx` | Anonymous browser visitors can cut once per event token. |
| Winner emails | `lib/weekly-email.ts`, `lib/weekly-email-template.ts` | Frozen results, verified account email and repeat protection. |
| Temporary modes | `lib/committee-review.js`, `lib/maintenance.ts`, `worker.ts` | Review and maintenance have different effects. See below. |

## Temporary modes

| Mode | What visitors see | Writes | Background job |
| --- | --- | --- | --- |
| Normal schedule | The challenge whose real start/end window contains the current time | Usual account, ownership and deadline rules | Finalizes closed weeks and processes congratulations |
| Committee review | The pinned week, currently week 05 | Profile setup/renaming only. Drawing attempts stay local. | Returns immediately |
| Maintenance window | The exam message instead of the application | Application API requests receive temporary-unavailable responses | Returns immediately |

Review bypasses the maintenance page. Clearing review resumes whatever the **actual** calendar allows. The configured November exam window has already expired. Update a maintenance window deliberately if another pause is needed.

## Database records

D1 is the application database. Supabase Auth is a separate account service.

| Table | What it stores |
| --- | --- |
| `profiles` | Verified account ID, display name and its normalized uniqueness key |
| `ideas` | Challenge/angle ID, author ID, title, short explanation and creation time |
| `idea_drawings` | One small raster drawing and its revision hash for an idea |
| `comments` | Discussion entries linked to ideas and verified authors |
| `reactions` | One like state per idea/account pair |
| `weekly_results` | Frozen participant totals and rank per closed week |
| `finalized_weeks` | Marker preventing a week from being finalized twice |
| `weekly_email_deliveries` | Private outgoing-email jobs, retry state and provider receipts |
| `opening_events`, `opening_visitors`, `opening_cuts` | Ribbon targets, anonymous browser tokens and accepted cuts |
| `d1_migrations` | Applied migration ledger |
| `launch_test_archive_*` | Retired pre-launch activity, preserved separately from official participation |

`db/schema.ts` describes the Drizzle application schema. The SQL migrations and specialized runtime schema helpers also define auxiliary tables such as the outbox and ribbon records. Do not assume one file alone is a complete database export.

Migrations `0003` and `0005` contain historical cleanup/archiving. They are guarded by recorded migration names. Do not delete the production ledger or replay old cleanup manually. A portal data move needs an explicit mapping and a verified backup first.

## Supporting folders

- `components/ui/` contains reusable UI building blocks. Many are supplied components rather than IBTKR business rules.
- `public/` contains the club logo, favicon and Arabic fonts. Font and third-party licence text should remain intact.
- `app/lab/` and the drawing preview routes are experiments or comparison pages. Unlisted URLs and `noindex` are not password protection.
- `examples/` is reference starter code, not the live community database API.
- `build/`, `scripts/` and `vendor/` support installation/build compatibility. The active Vite configuration is `vite.config.ts`.
