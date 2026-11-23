# Repository publication review · 23 November 2026

## Scope

The preparation began from `66848ab48d18291e820de2ed83e2e5c6ef28629f` on `main`. It includes a friendly English/Arabic handover and a separate requested cleanup and maintenance change.

- Examined 195 tracked text files in the original source tree.
- Scanned available patches and messages for 89 distinct commits across the three original branches. The initial lockfile was read separately because its large patch was omitted by the API.
- Checked credential patterns, private-key material, local secret/database/export filenames and hard-coded email addresses.
- Retained required fonts, brand assets and licence notices.

No live credential or participant contact list was found within that review scope. The secret-shaped authentication test value is an intentionally invalid fixture. Publishable/site keys and service resource IDs are not server credentials.

Unreachable Git objects, service-side bindings and account permissions are outside this source review. Tests and scans do not establish provider delivery or inbox placement.

## Resulting source

- Clear README, Arabic introduction, architecture map, feature guides and portal handover notes.
- Removed the unlisted 3D game, sketch lab, cup/car comparison routes, opening rehearsal and hidden preview bypass.
- Removed the historical committee-review pin and obsolete starter/build helpers.
- Retained official challenge components, stable week IDs, scoring, ribbons, drawings and email repeat protection.
- Replaced the dated exam pause with a reusable maintenance switch, enabled for this release. Email sending is independently disabled.
- No participant-data deletion, database reset, manual email send or new migration is part of this release.

Deleted experiments still exist in Git history. Publishing a repository reveals that history as well as its newest tree.

## Verification

Run the complete isolated suite, TypeScript check and production build for this cleanup. Maintenance tests cover direct API calls, stale clients, exact asset paths, empty HEAD responses and paused scheduled work. Production deployment and live verification are separate release steps.

Public readers do not need collaborator invitations or push permission. Keep owner edit access so the maintenance setting can be changed later. See [SECURITY.md](../SECURITY.md).
