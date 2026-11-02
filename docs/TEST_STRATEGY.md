# Test Strategy — It Works

**Status:** required quality criteria, not yet running tests.

## Test layers
1. **Pure unit tests:** domain comparators, value validation, timezone functions, version interpretation and history selectors.
2. **Database integration tests:** migrations, same-owner references, RLS policies, transaction correctness, date sorting and constraints using a reproducible isolated database.
3. **API/contract tests:** bad input, unauthenticated actions, ownership, schema compatibility, safe errors and concurrency.
4. **End-to-end UI tests:** a real logged-in session adds folder, standard and goal, records actuals, sees left/right correct, moves/archives/edits, and revisits history.
5. **Manual acceptance:** keyboard/mobile navigation, PWA installation, logout behavior, no-data UX and ambiguous frequency labeling.

## Critical table-driven domain cases
| Scenario | Required outcome |
| --- | --- |
| No actual for numeric metric | Unknown; never treat as zero |
| Current friends=1, target=4, at least | Unmet, shortfall 3 friends |
| Current friends=4, target=4 | Met |
| Goal relationship false vs true | Unmet boolean condition; no numeric score |
| Weekly self-reported fasting 1/week vs 2/week | Unmet, exact period labels, tagged self-report |
| Monthly EUR100 vs monthly EUR2000 | Unmet, compatible money gap EUR1900/month |
| EUR/month vs USD/month | Incompatible/no delta unless supported conversion explicitly exists |
| EUR/week vs EUR/month | No numeric delta absent explicit timebase conversion |
| Current=0, target=0, exact | Met, no divide-by-zero |
| Lower-is-better value 3 vs target <=2 | Unmet; comparator direction respected |
| 80% vs target >=20% | Met; not a 'shortfall' |
| Backdated measurement entered today | Current selected by observation time, not insertion time |
| Corrected prior measurement | Correction preserved; derived history skips superseded duplicate |
| Target changed from 4 to 3 | Historical target 4 remains visible at prior effective time |
| Archived/moved metric | History and metric identity maintained |
| Metric not updated for user-defined stale interval | Stale, not automatically failed |
| Week without occurrence coverage | Insufficient data, not zero completions |

## Security-focused tests
- Two independent authenticated accounts in test database.
- Access test per table for SELECT, INSERT, UPDATE, DELETE.
- Test attacks through nested FK references, joins, RPC, exports and API routes.
- Session expiration and account switching ensure cached private content is unavailable.
- Test invalid JSON types, excessive inputs, unexpected currencies and HTML/script content.

## UI invariants
- **Current is visually left of desired** for all side-by-side comparisons on desktop and mobile where layout is side-by-side.
- On stacked narrow layouts, Current precedes Desired in semantic reading/keyboard order.
- User-provided custom labels are not forcibly renamed, moralized or collapsed into generic categories.
- Show explicit no-data and not-yet-recorded states, including dates of last measurement.
- Routine rates are identifiable as self-reported versus occurrence-derived.

## Minimum CI
- Lockfile consistency and deterministic install.
- Typechecking, linting, formatting checks.
- Domain unit suite.
- Schema validation/tests.
- Integration/RLS suite if schema changes; use isolated secretless local environment or appropriately scoped CI secrets.
- E2E smoke suite when the UI workflows exist.
- Dependency/security scan as the product approaches public release.

## Evidence requirements
An agent cannot say "tests pass" without executing them. Report exact commands, outcomes and any skipped checks. A screenshot of a mocked dashboard is not functional verification. A PWA manifest is not proof of installability, offline sync, or safe caching.

## Manual review checklist for the private alpha
- Create at least two unrelated folders and 3+ metric types.
- Close/reopen browser; values persist under same login.
- On another account, data is absent and unreachable.
- Change target, verify old desired value is still historically accessible.
- Use keyboard only and small-screen viewport.
- Disconnect network, confirm honest sync status and no false save acknowledgment.
- Export records and verify adequate privacy protection when available.
