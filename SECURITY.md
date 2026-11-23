# Security and repository sharing

## Access boundaries

This repository is prepared for public code inspection. Public visibility includes tracked files, accessible Git history and public build logs. It does not grant access to Cloudflare, Supabase, Resend or the live student database.

Public visitors can read and copy code without becoming collaborators or receiving push permission. Keep owner access for maintenance and releases. Archiving would make the owner's repository read-only too and prevent normal updates. Review any existing collaborator permissions separately in GitHub settings.

The production `main` branch triggers a Cloudflare build. Give code review its own branch and keep production publishing deliberate.

## Public configuration versus secrets

The Supabase project URL, Supabase **publishable** key, Turnstile **site** key, Worker/D1 resource identifiers and sender domain are configuration, not server credentials. They identify services but do not replace account verification or authorize administrative access.

Resend sending keys, Supabase secret/service-role keys, Cloudflare API credentials, private keys, local `.env`/`.dev.vars` files, login tokens and participant exports must stay outside Git. `.gitignore` excludes the usual local secret files. Ignoring a file does not erase it from existing Git history.

The value beginning `sb_secret_` in the authentication test is an intentionally invalid dummy used to verify that public configuration refuses server secrets. It is not a production credential.

## Production data

Students' contributions and drawings are stored in D1. Authentication/account email records belong to Supabase Auth. The private email outbox can contain recipient information and must not be exposed as a public feed or copied into fixtures.

Preserve normal account checks when demonstrating the application. Experimental routes and the hidden opening shortcut have been removed. Maintenance is enforced before application requests, including direct API calls.

## Checks for a handover

Review tracked files and accessible branch history for credentials and personal exports. Check suspicious values in context rather than treating public keys or deliberately invalid test fixtures as live secrets. Include licences and dependency versions in the handover. Removed experiments remain in Git history, so deletion from the current tree is not history erasure.

If a real credential is discovered in history, removing it from the newest file is insufficient. Rotate/revoke it with the service owner and agree how to handle affected history before sharing access. Do not rewrite shared history silently.

Automated scans and tests reduce risk but are not a security certification. Production bindings, account permissions and provider delivery health must be verified in their respective services when those operations are needed.
