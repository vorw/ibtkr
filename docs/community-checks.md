# Weekly community verification — 5 October 2026

The weekly flow and release boundary are documented in [weekly-program.md](weekly-program.md).

## Automated checks

Run these with Node 24 after installing the locked dependencies:

```sh
pnpm test:community
pnpm test:auth
pnpm exec tsc --noEmit
pnpm build
```

The combined authentication and community suite has 34 checks, using isolated identities and in-memory SQLite created from all real migrations. Coverage includes server-verified identity, safe login return context, profile validation, multi-angle entries, author-only editing, exact retry recovery, self-vote rejection, duplicate voting, weekly totals, tied ranks, cutoff guards including in-flight writes, archive access, escaped search, large feeds, 140-participant ranking pages, long discussion pages, frozen results and Wednesday rollover in Riyadh.

## Browser checks still required

Check the actual application at phone and desktop sizes in both themes. Verify main-tab naming, removal of the tasks tab, angle transitions and hints, multiple submissions and editing, sign-in/draft recovery, week/angle/search filters, community and ranking pagination, comments, end-of-week locks, shared winners and empty/waiting states. Confirm the brand reads **FTC / IBTKR**.

Browser layout verification was not completed in this environment. Automated route checks and a successful build do not substitute for this check.

## Production boundary

This change has not been deployed. Preserve the existing Cloudflare database and Supabase authentication. Apply migration 0002 before deploying the updated Worker; confirm the Tuesday 21:00 UTC scheduled handler. Older entries remain archived and accessible, without contributing to weekly results.
