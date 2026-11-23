# Weekly programme

## What a week means

A challenge has a stable `id`, visible `number`, title, description, start/end timestamps and three stored angle IDs. It may accept text or a drawing. Some formats, such as packaging icons, provide their own interaction instead of the normal angle selector.

`lib/weekly.ts` is the source of truth for scheduled weeks. `lib/weekly-content.ts` supplies prepared written prompts, with drawing-specific content substituted in `weekly.ts` where needed. Prepared content is not evidence that every week has been announced or played.

The current twenty-week schedule starts **10 October 2026 at 00:00 Riyadh** and its last week closes **27 February 2027 at 00:00 Riyadh**. The code validates contiguous seven-day windows. Date-shaped IDs retain their historical spelling and do not represent the actual start date.

## Implemented examples

| Week | Stable ID | Experience | Riyadh window, end exclusive |
| --- | --- | --- | --- |
| 01 | `week-2026-10-14` | Subscription cancellation, written solutions | 10–17 October 2026 |
| 02 | `week-2026-10-21` | Try before buying, written solutions | 17–24 October 2026 |
| 03 | `week-2026-10-28` | Redesign a car warning icon, drawing | 24–31 October 2026 |
| 05 | `week-2026-11-11` | Packaging icons, two-minute drawing activity | 7–14 November 2026 |

Week 03 uses the car-symbol content. The discarded cup preview and historical committee-review pin have been removed. Maintenance pauses access without changing any challenge ID or timestamp.

## Closing time

Normal participation and voting continue through Friday **23:59:59.999 Riyadh**. The exclusive end is Saturday **00:00 Riyadh**, which is Friday **21:00 UTC**.

At that boundary, new submissions, edits and vote changes for the old week are rejected. Server and database clocks enforce the boundary even if a browser was left open. The next scheduled challenge becomes current without waiting for emails. If the finite schedule runs out, the site shows a waiting state.

## Scores, ties and XP

- A participant's weekly score is the total genuine likes on all their contributions to that challenge, across angles.
- An account can like each other participant's idea once. Self-likes do not count.
- Ranking uses SQL `RANK()`: scores `5, 5, 3` produce ranks `1, 1, 3`.
- Congratulations eligibility is **frozen rank 1–3 with positive likes**, including ties. Zero likes never creates an eligible winner. Ties may produce more than three recipients or skip a rank.
- Lifetime XP is separate: 20 XP for first participation in a challenge, and 5 XP for the first comment on each other person's idea.

## Freezing and archives

`finalizeClosedWeeks()` writes a closed week's ranking and its finalization marker in one atomic batch. Repeating the operation does not replace the snapshot. It normally runs from the scheduled job, with community reads providing a fallback.

Archived contributions and final rankings remain linked to their original week. Discussion can remain open in normal mode. Maintenance blocks all application requests, including comments. A new week does not reset account profiles or lifetime progress.

## Changing future content

Add or update reviewed **future** challenges before their opening date. Keep old IDs, dates and stored angle identifiers stable. Never reuse an old ID for a different problem.

A new interaction needs both content and an appropriate UI implementation. Follow [Portal handover](portal-handoff.md) and [Drawing experiences](drawings.md) rather than assuming that editing question text changes the interaction.
