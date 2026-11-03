# Architecture — Native-ready Web/PWA First

**State:** The shipping client is the vanilla JavaScript PWA at the repository root (no build step). ADR-001 in `docs/DECISIONS.md` is the stack decision: web/PWA first, then a Capacitor wrap for iOS. The monorepo diagram below is an old proposal, not the current layout. Supabase remains unconnected.

## Objectives
Build an actual secure, testable and maintainable product, not a disposable visual demo. Keep comparison rules out of the page. Do not start a second UI until the Capacitor wrap is actually in progress.

## Current stack
- **Web:** static `index.html`, `styles.css` and `src/*.js`. Domain rules live in `src/domain.js` and do not touch the DOM.
- **PWA:** manifest, PNG icons (including `apple-touch-icon`) and a service worker that caches the app shell only. Private workspace data stays in `localStorage` and is not cached by the worker. Offline shell is not offline sync.
- **Cloud (not connected):** draft Supabase/Postgres schema with RLS under `supabase/`. Still a proposal (T-002).
- **Testing:** Node's built-in test runner, a Playwright iPhone smoke test, and a Postgres RLS smoke workflow for the draft schema.
- **iOS:** Capacitor 8 project in `ios/`, produced by `npm run cap:sync`. The website stays the source of truth. On the phone the workspace is a JSON file (ADR-002). Not Expo and not React Native.
- **Hosting:** GitHub Pages. See the README for the one-publisher setup. Never expose service-role credentials to clients.

## Earlier proposal, not the current layout
The notes below described a Next.js and Expo monorepo. ADR-001 superseded that client choice. They remain only as a boundary sketch if a future decision splits packages.

## Proposed repository layout
```
apps/
  web/                    # Not created. The PWA is the repository root.
  mobile/                 # Future Capacitor iOS project; not required yet
packages/
  domain/                 # Not created. Rules live in src/domain.js today.
  contracts/              # Shared input/output schemas, if a second client appears
  data-access/            # Backend-adapter interfaces; no UI-specific semantics
supabase/
  migrations/             # Draft SQL and RLS policies; not connected
docs/
  DATA_MODEL.md
  SECURITY_PRIVACY.md
  TEST_STRATEGY.md
  DECISIONS.md
```
Do not generate empty modules merely to mimic this diagram. Split packages only when a second runtime needs them.

## Logical boundaries
```
[Web UI / PWA]          [Future Capacitor WebView]
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
- Keep domain rules in `src/domain.js`, with no DOM dependency.
- Portable schema contracts and a documented authenticated API interface, when cloud persistence exists.
- Encapsulate auth/session, storage, notifications, timezone and offline persistence behind adapters.
- Do not implement comparison rules in UI code.
- The later iPhone app is a Capacitor wrap of this PWA (ADR-001), so it reuses the same pages rather than a second native layout.
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
