# Architecture — Native-ready Web/PWA First

**State:** Proposed implementation blueprint; stack is a recommendation, not yet a completed installation or irreversible mandate. Validate tool versions and exact capabilities at implementation time.

## Objectives
Build an actual secure, testable and maintainable product, not a disposable visual demo. Favor a thin web client over coupling core business logic to a UI framework. Preserve optionality for future iOS/Android clients without investing in two interfaces now.

## Recommended stack
- **Web:** Next.js + React + TypeScript (App Router) with strict TypeScript.
- **PWA:** web manifest, icons, installability and deliberately bounded caching/service worker (never promise offline sync until implemented).
- **Cloud:** Supabase Auth + PostgreSQL + Row Level Security (RLS) and versioned migrations.
- **Validation/contracts:** Zod (or another explicit, versioned schema contract) shared between clients/server.
- **Testing:** Vitest for pure domain logic, integration tests against isolated local/test Postgres/Supabase, Playwright for end-to-end.
- **Native later:** Expo / React Native with shared domain and contract packages; UI code is expected to be platform-specific.
- **Hosting:** choose a compatible host/deployment pipeline after local functional verification. Never expose service-role credentials to clients.

Alternate equivalent technology may be justified by a documented decision record. The architecture boundaries below matter more than specific vendors.

## Proposed repository layout
```
apps/
  web/                    # Next.js UI, PWA, API boundaries
  mobile/                 # Future Expo app; not required for MVP
packages/
  domain/                 # Pure TS logic: metrics, comparisons, formatting-agnostic rules
  contracts/              # Shared input/output schemas, discriminated unions
  data-access/            # Backend-adapter interfaces; no UI-specific semantics
supabase/
  migrations/             # Versioned SQL and RLS policies
  seed.sql                # Fictional, optional development fixtures only
docs/
  DATA_MODEL.md
  SECURITY_PRIVACY.md
  TEST_STRATEGY.md
  DECISIONS.md
```
Create this scaffold incrementally. Prefer a monorepo with workspace tooling once real packages exist; do not generate empty modules merely to mimic this diagram.

## Logical boundaries
```
[Web UI / PWA]          [Future Expo UI]
      |                       |
      +----> [Shared contracts] <----+
                     |
             [Public authenticated API]
                     |
          [Authorization + services]
                     |
             [Postgres + RLS]

[Pure domain functions: comparison / validation / frequency rules]
             ^ reusable from server and both clients
```
The API boundary should not expose database internals, service keys or direct tenant assumptions. With Supabase direct client access where appropriate, RLS is still mandatory and tenant testing is required.

## Data design commitments
- User-owned `areas`, `metrics`, `actual_observations`, `target_revisions`.
- Type-safe values: tagged/discriminated JSON or explicit typed columns with constraints. Avoid a single ambiguous `value TEXT` field.
- Distinguish metric `kind` (standard/goal) from `value_type` (number/boolean/money/frequency/etc.).
- Stable UUID identifiers; created/updated timestamps; soft archive separate from deletion.
- Actual and desired data stored separately. Never overwrite prior observations when editing target.
- Each point in historical data needs an effective/observed time and creation time for backdated entry auditing.
- Currency and time period are part of the unit, e.g. EUR/month, not merely text on the screen.
- All user-facing statuses computed from exact observed values/defined rules, with insufficient-data semantics.

See [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Comparing metrics
A domain-level function accepts (metric definition, current observation or null, target revision, reference period) and returns a **typed result**, e.g.:
- `status: met | unmet | unknown | insufficient_data | stale`.
- `delta` only where meaningful and compatible.
- `explanation` describing threshold/window/data source.
- Optional `coverage` for occurrence-based routine tracking.

It must not return a universal 0–100% happiness/life score. Formatting, localization, charting and component placement live in UI, not domain.

## PWA and eventual native portability
- Use a domain package without React/DOM/Next imports.
- Portable schema contracts and a documented authenticated API interface.
- Encapsulate auth/session, storage, notifications, timezone and offline persistence behind adapters.
- Avoid implementing core rules in server components or client hooks.
- Mobile later reuses domain, types and server services, but will have its own layout and navigation.
- Document migration paths, data portability, and API versioning.

## Cloud, sync and history
- A write is complete only when the server acknowledges it.
- Support retries/idempotence and stale write/conflict detection as app matures.
- No optimistic UI that hides permanent failure.
- Database transactions for changing target revisions, moving metrics and corrections as applicable.
- Observations/revisions are queryable by date with safe pagination.
- Indexed ownership foreign keys and time-sorted observations.

## Security and privacy
Cloud account auth is user-selected. Use RLS policies on *every* user-owned table and defensive ownership checks for indirect references. Never store sensitive user data in public repository samples. See [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md).

## Deployment and engineering gate
First verify local app boots and domain tests pass; then migrations, RLS isolation tests and E2E flows; only then configure staging production environment. Deploys must be reproducible, with env vars documented in an `.env.example` excluding secrets. A manifest alone does not make a working offline PWA.

## Architecture anti-patterns
- Hardcoded "mandatory" life folders.
- UI component as the source of truth for comparisons.
- Mixing desired target into current observation fields.
- Updating one row repeatedly and losing history.
- Generic score that penalizes user-authored friendships/relationships.
- Client-side user ID filters treated as data security.
- Shipping mocked UI with a false claim that cloud sync is working.
