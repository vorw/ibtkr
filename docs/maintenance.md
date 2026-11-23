# Pausing and reopening the site

## One reusable switch

`lib/site-settings.ts` contains `siteSettings.maintenance.enabled`. It is currently `true`. The page copy/design lives separately in `lib/maintenance-page.ts`. There is no date window, browser shortcut or public admin URL that can bypass the pause.

| While enabled | Behaviour |
| --- | --- |
| Page requests | Branded Arabic maintenance page, HTTP 503 |
| API and write requests | JSON 503 before account/data handlers run |
| Background schedule | Returns before D1 finalization or email work |
| Assets | Only exact logo, favicon and two local font paths allow GET/HEAD |
| Stored data | Existing records remain stored. No cleanup migration is added. |

Responses use `no-store`. `Retry-After: 3600` is a suggested retry interval, not an announced reopening time. No return date is promised in the page.

## Reopen deliberately

1. Review `lib/weekly.ts`. Reopening follows real time, not the old committee demo week. Correct future content before release without recycling past IDs.
2. Keep `WEEKLY_EMAIL_ENABLED` set to `"false"` while reviewing past results and any pending outbox work. The normal job/read fallback can finalize overdue weeks once maintenance is off.
3. Set `siteSettings.maintenance.enabled` to `false`.
4. Run `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm build`.
5. Merge the reviewed change to `main` through the existing Cloudflare build, then verify the live interface and API.

Enable email sending separately only after an operator reviews pending jobs, production bindings and provider evidence. Do not add a second manual sender. See [weekly congratulations](weekly-emails.md).

To pause again, set the same switch to `true`, validate and deploy. No replacement page or scheduled expiry is necessary.
