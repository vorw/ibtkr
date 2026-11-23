# Security and repository sharing

## Access boundaries

This is a private code repository. Repository access includes its files and accessible Git history. It does not automatically grant access to Cloudflare, Supabase, Resend or the live student database.

The repository belongs to a personal GitHub account. GitHub personal private repositories give collaborators read/write access, not a read-only role. See [GitHub permission levels](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository). For code inspection without access to the production-connected repository, share a source snapshot or use a separate review repository. Organization-owned repositories offer more granular roles.

The production `main` branch triggers a Cloudflare build. Give code review its own branch and keep production publishing deliberate.

## Public configuration versus secrets

The Supabase project URL, Supabase **publishable** key, Turnstile **site** key, Worker/D1 resource identifiers and sender domain are configuration, not server credentials. They identify services but do not replace account verification or authorize administrative access.

Resend sending keys, Supabase secret/service-role keys, Cloudflare API credentials, private keys, local `.env`/`.dev.vars` files, login tokens and participant exports must stay outside Git. `.gitignore` excludes the usual local secret files. Ignoring a file does not erase it from existing Git history.

The value beginning `sb_secret_` in the authentication test is an intentionally invalid dummy used to verify that public configuration refuses server secrets. It is not a production credential.

## Production data

Students' contributions and drawings are stored in D1. Authentication/account email records belong to Supabase Auth. The private email outbox can contain recipient information and must not be exposed as a public feed or copied into fixtures.

Preserve normal account checks when demonstrating the application. Unlisted lab URLs and a local opening-preview shortcut are presentation tools, not private access controls.

## Checks for a handover

Review tracked files and accessible branch history for credentials and personal exports. Check suspicious values in context rather than treating public keys or deliberately invalid test fixtures as live secrets. Include licences, dependency versions and the distinction between production code and experiments in the handover.

If a real credential is discovered in history, removing it from the newest file is insufficient. Rotate/revoke it with the service owner and agree how to handle affected history before sharing access. Do not rewrite shared history silently.

Automated scans and tests reduce risk but are not a security certification. Production bindings, account permissions and provider delivery health must be verified in their respective services when those operations are needed.
