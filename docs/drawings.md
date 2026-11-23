# Drawing experiences

## Two official drawing formats

| Format | Participant flow | Main files |
| --- | --- | --- |
| Car warning symbols | Choose a warning, read its prompt/hint, then draw or upload a redesign and add a short explanation | `app/weekly-challenge-view.tsx`, `app/warning-challenge-visuals.tsx`, `app/drawing-studio.tsx` |
| Packaging icons | Start a countdown, reveal one random task, draw for up to two minutes, optionally skip twice, then continue to the sharing form | `app/packaging-challenge.tsx`, `lib/packaging-game.ts` |

The official car-symbol content is `warningChallengeContent` in `lib/weekly.ts`. The cup content remains available only as a comparison preview.

## Packaging timer

The bank contains **30 object-focused prompts**. Prompts are hidden from the visible page until the start countdown finishes. A participant gets **120 seconds** and **two skips**. Skipping clears the current drawing but does not restart the timer. The same browser avoids recently used tasks until its task history is exhausted.

An attempt is saved locally and resumes after refresh. Finishing or reaching the deadline locks the drawing tools. The finished activity offers sharing, without an official retry or download action. The parent page then shows the normal contribution form. In normal mode, the attempt cannot extend beyond the week's real deadline.

`packagingGameHtml` is an embedded HTML document stored as a TypeScript string in `lib/packaging-game.ts`. The readable function names inside it describe the state changes: `begin`, `skipTask`, `tick`, `end`, `show`, `redraw` and `store`. `app/packaging-challenge.tsx` inserts the task bank, checks messages from the correct iframe and passes a valid drawing to the parent interface.

## Committee review

Review gives the activity a separate browser-storage key and permits a full two-minute local attempt after the historical close. This is a presentation-only timer window. It does not change the real week ID or deadline. Completing the review opens a drawing preview with **إغلاق المعاينة**, without posting it to the community.

## Saved drawings

A drawing contribution has one JPEG attachment and a 2–180 character explanation. The browser converts supported JPG/PNG/WebP inputs into a small raster image. `lib/drawing-policy.ts` validates the data format and size. SVG, remote image URLs and executable markup are not accepted as contribution images.

`idea_drawings` stores the image in D1, linked to the idea ID. Feed responses contain a revision hash rather than the whole image. `/api/drawing?id=…` performs the normal account check and returns a private, no-store JPEG response. Entry/image writes are batched so an image failure cannot leave a half-saved contribution.

## Comparison routes

`/drawing-preview` and `/drawing-preview2` show local comparison experiences. The older `/ink-7q` link redirects to `/drawing-preview`. The lab routes are unlisted and marked `noindex`; these measures do not make a page private. The original 3D gift prototype is experimental and does not write to the production database.

For substantially larger drawing usage, evaluate object storage as a future design decision. The current implementation deliberately uses small D1 attachments.
