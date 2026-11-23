# Moving IBTKR into the club portal

## Purpose of this handover

Use the existing site and repository to understand participant journeys, data rules and the flexibility of weekly challenge interfaces. The portal's final architecture, hosting and redesign are decisions for its technical team. This repository does not claim that integration is already implemented.

## Keep the shared shell, allow different challenge experiences

| Consistent across challenges | Can change with each challenge |
| --- | --- |
| Account identity and display name | Question, hints and illustrations |
| Navigation, community and archive access | Text form, free drawing or timed drawing |
| Ownership and input validation | Instructions and rules for an activity |
| Vote uniqueness and weekly score rules | Reveal animation, sound effects and task selection |
| Stable challenge IDs and result snapshots | Layout, controls and progress feedback |

A single question field and a text/drawing toggle do not reproduce the timed packaging challenge. It has a hidden task, countdown, attempt state, two skips, an expiry lock and a result handoff. These are separate interaction states, not just content.

The current implementation selects a theme in `lib/weekly.ts` and renders an appropriate component in `app/innovation-app.tsx`. It is not an existing plugin builder or a general content-management system.

## Agree on these points before rebuilding

1. **Weekly UI ownership:** who implements a new activity when content alone is insufficient?
2. **Preview path:** how can the innovation team and leader test an unreleased experience without touching live votes, results or submissions?
3. **Release path:** how is an approved challenge interface published alongside its schedule?
4. **Identity mapping:** how will existing Supabase account IDs map to portal accounts without matching people by display name?
5. **Data scope:** which official contributions, drawings, comments, reactions and result snapshots need migration?
6. **Email responsibility:** which system will own the outbox and repeat protection after the move? Only one sender should own a given award.

These are implementation decisions to agree together, not features already available in the portal.

## Useful acceptance examples

- A written challenge opens with no angle preselected, accepts a valid solution and appears in the appropriate week's community feed.
- A drawing challenge displays the saved drawing under the same verified account rules as its caption.
- A packaging challenge hides its task until start, gives 120 seconds, allows two skips without resetting time and locks after finishing.
- A closed week rejects edits and vote changes while retaining its final leaderboard, including ties.
- Switching a challenge interface does not change the account, community history or previous week IDs.
- A preview run cannot alter official results or send congratulations.

## Review sequence

Read the [Arabic introduction](START_HERE_AR.md), then [architecture](architecture.md). Use the code and isolated tests while live maintenance is enabled. Run interactive checks against a development database. Walk through `lib/weekly.ts`, the corresponding UI, the community route and the frozen-result query together. Use the tests to confirm expected behaviour before deciding what to carry into the portal.

`main` is production-connected. Start code experiments on a separate branch. A review invitation should not require access to production service dashboards, credentials or participant exports.
