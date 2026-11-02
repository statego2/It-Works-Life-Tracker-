# Cloud Foundation — Prepared, Not Connected

## What exists
`supabase/migrations/20261103000000_initial_schema.sql` describes an initial PostgreSQL schema:
- User-owned folders, goals/standards and their independent manual ordering.
- Append-only actual observations and target revisions.
- Personal notes, purpose and optional vision-board settings.
- Image metadata only; eventual image files belong in **private** object storage.
- Row Level Security (RLS) on all seven user-owned tables.
- Same-owner composite foreign keys to block cross-user folder/metric/observation references.

## What does NOT exist
- No Supabase project has been provisioned or connected.
- No live account login, upload endpoint, cloud sync, or encrypted data migration exists.
- The frontend remains **localStorage-based** and explicitly warns about sensitive information.
- RLS has not been tested against a running database. This migration is an engineering starting point, not a certified security guarantee.

## Implementation sequence
1. Create a dedicated private Supabase development project and capture credentials through a secure secrets manager — **never commit secrets**.
2. Apply migrations to local/test Postgres. Verify they execute and are idempotent when tracked as migrations.
3. Add integration tests that authenticate as two separate users, including cross-account inserts referencing another owner's IDs, public/anonymous SELECT, RPC/export paths and ownership updates.
4. Add typed repository adapters and authenticated API boundaries, keeping `src/domain.js` independent of the backend.
5. Define reconciliation/import rules for existing browser data, including safe snapshot/export before first cloud transfer and conflict resolution.
6. Implement the private vision image bucket and owner-scoped object storage policies, enforcing upload size and MIME checks.
7. Only then offer cloud sync to users, with logout cache isolation, error handling and accurate sync-status UI.

## Additional safety review
- Migrations are not complete production policy: validate per-table read/write access, cascade deletes, note size, binary image handling and token expiration.
- API code must never use privileged service keys in the browser.
- Keep personal metric labels and images out of external analytics.
- Avoid mixing the meaning of numeric 'achievement' with qualitative life-worth judgments.

**No external credentials are needed to continue with local app polish and tests.**
