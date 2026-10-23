# Drawing challenge

Week 03 (`week-2026-10-28`) is the cup sketch round. Its unchanged window is
2026-10-23 21:00 UTC through 2026-10-30 21:00 UTC (Saturday midnight Riyadh).
Other weeks retain text submissions. Voting, frozen results and winner email
eligibility are unchanged. The weekly question ribbon requires five distinct
visitor cuts; earlier cuts and opening timestamps are preserved. An unopened
event with enough existing cuts opens automatically on its next read.

The unlisted leader preview is available at `/drawing-preview`. The earlier
`/ink-7q` address redirects there, and the original lab link remains valid.
These previews are not password-protected or listed in navigation.

- One JPEG attachment and a 2–180 character caption; the caption supplies the
  internal title. Drawing directly and uploading share the same submission path.
- The client rasterizes JPG/PNG/WebP, strips source metadata, fits within 1400px,
  and compresses to at most 180 KB. Unsupported files and blank uploads fail
  without discarding the previous sketch. Local drafts contain the raster image.
- `idea_drawings` stores these intentionally small sketches in the existing D1
  binding. No R2/Supabase storage resources, secrets or credentials are required.
  The feed returns only the SHA-256 revision, never inline image data.
- `/api/drawing?id=...` uses the same verified account check as the community.
  Images are private/no-store, JPEG-only and nosniff. No bearer token enters a URL.
- Entry/image creation and edits use D1 batches so a failed image write rolls
  back the entry. Ownership and database-clock deadlines also protect images.
- The unlisted, noindex sketch lab is an in-memory UI preview only: no account,
  submission API, database writes, cuts, votes or emails.

If drawing rounds become frequent or usage grows substantially, move image
  bodies to object storage instead of increasing the size limit in D1.
