# Opening ribbons

There are two separate ribbon events. They use the same interaction, but opening one does not reset or open the other.

| Event | Current configuration | Purpose |
| --- | --- | --- |
| Whole-site launch | `lib/opening.ts`: event `ibtkr-official-opening-2026-10-10-reset-1`, target **10** | The original launch ceremony |
| Weekly challenge | `lib/weekly-ribbon-policy.ts`: target **5** | Reveal a new weekly question while other sections remain available |

Old rehearsal events and accepted cuts are retained. Changing a target must not delete cuts or replace an existing opening timestamp. A read can open an unopened event that already has enough accepted cuts.

## Anonymous participation

Cutting does not require a user account. A same-origin GET can create an opaque visitor UUID in a secure, HttpOnly, SameSite=Strict cookie. A cut is accepted only for a known visitor in the correct event. Each event/visitor pair can contribute once. Atomic database statements cap the count and set the opening timestamp safely under concurrent requests.

This is **browser-token uniqueness**, not proof of one human per cut. Clearing cookies or using another device can create another token. Shared browsers share a token. The feature does not collect fingerprints or IP addresses to solve that limitation.

Only the current browser's private cut position is returned. Other visitor tokens and contact details are not exposed. An accepted cut records a position/time, not the person's name or account. No optional identity-registration form is implemented.

## What happens after opening

Waiting visitors see the ribbon release. Later visits skip the completed ceremony. Refreshing a finished weekly opening must not flash the old wrapper. The weekly opening affects the question, while the community, leaderboard and profile navigation remain available under their normal rules.

Maintenance blocks ribbon reads/cuts along with application requests. Stored opening events and accepted cuts remain intact. Normal sign-in is required for private community content when the site reopens.

## Accessibility and sound

The rehearsal route and invisible top-right preview bypass have been removed. Query parameters do not grant access past the opening gate.

Pointer, tap and keyboard alternatives use the same server rules. Reduced motion limits decorations. Audio uses unpitched physical effects such as scissors, cloth, air and applause-style noise. It does not include music or pitched instruments.

See `tests/opening.test.mjs`, `tests/weekly-opening.test.mjs` and the audio suites for cookie, cutoff, concurrency and accessibility-related behaviour.
