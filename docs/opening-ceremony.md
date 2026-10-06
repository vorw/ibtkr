# Shared ribbon opening — two-account test

The homepage begins with a purple ribbon in the existing Arabic identity. Verified signed-in participants drag the scissors down through the ribbon, or use the keyboard or alternative cut button. Every account contributes once. A shared 0/2 count updates every two seconds while the page is visible. The second cut opens the site globally; visitors already waiting see the ribbon fall away and the homepage appear, while later visits go straight to the site.

The live event is `ribbon-test-2026-10-07`, with a target of two, defined in `lib/opening.ts`. D1 stores the event and unique `(event_id,user_id)` contributions. Insertion, the count cap and the permanent opening timestamp change in one atomic batch. Refreshes, retries and concurrent cuts cannot add duplicate participants or overshoot the limit. `/api/opening` exposes counts and the requesting account's contribution flag, with no participant identities. Community reads and writes are also gated on the server. Login remains available; no username is required to cut.

The ceremony does not change weekly dates, XP, challenge content, finalized results or winner emails. It has no time fallback during this requested two-user test.

`/opening-preview` is a visual rehearsal with local state only. The first cut shows the waiting state; “جرّب القصّة الثانية كمشارك آخر” lets the reviewer try the second gesture and reveal. Its completion screen contains no actual community content, makes no opening API calls, and does not consume live contributions. Reloading it restarts the rehearsal.

To review a different activity or re-arm after testing, deploy a new event ID. The old event and its contributions remain recorded. Changing the activity must not reuse an already opened event. Set `openingConfig.enabled=false` to remove the gate without deleting records. Do not manually manipulate contributions to simulate real users.

Reduced-motion visitors receive a brief reveal without falling decorations. Keyboard and tap alternatives work without dragging. Touch input uses pointer capture and `touch-action:none` only on the scissors, with a real response required before a contribution appears.

Validation: `npm run test:opening` covers guest privacy, distinct accounts, repeat visits, twenty concurrent cuts, cross-site and forged requests, username-free participation, server access control, transactional rollback, new event IDs and disabling the ceremony. Run community, auth and email suites, TypeScript and the production build before publishing.
