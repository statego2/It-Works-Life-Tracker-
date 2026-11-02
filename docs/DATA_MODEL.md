# Domain & Data Model — It Works

**Status:** proposed schema contract v0.1; implementation will require migration tests and security review.

## Core relationship diagram
```text
auth.users (identity)
   1 ── n areas
   1 ── n metrics
             ├── 1 ── n actual_observations
             └── 1 ── n target_revisions
```
Every row is user-owned and all cross-table references must stay within the same owner. Folder/metric ordering is a user-specific property; avoid domain-wide forced categories.

## Recommended tables

### `areas`
- `id UUID PK`, `user_id UUID NOT NULL` (references auth user).
- `name TEXT NOT NULL`, `description TEXT NULL`, `sort_order INTEGER NOT NULL`.
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `archived_at TIMESTAMPTZ NULL`.
- Names user-defined; duplicate names may be allowed if UX differentiates entries.
- No fixed domain `area_type` enum. Add safe size limits.

### `metrics`
- `id UUID PK`, `user_id UUID NOT NULL`, `area_id UUID NOT NULL`.
- `title TEXT NOT NULL`, `description TEXT NULL`, `sort_order INTEGER`.
- `kind ENUM('standard','goal')`.
- `value_type ENUM('number','money','percentage','boolean','frequency')` for MVP, designed for expansion.
- `comparison_operator ENUM('at_least','at_most','exact','equals')`.
- `unit_code TEXT NULL` for counts/custom units; `currency_code CHAR(3) NULL` for monetary data.
- `period_unit ENUM('day','week','month','year') NULL` where a recurring period is relevant.
- `measurement_mode ENUM('reported_rate','occurrence_derived','snapshot')` to prevent claims of verified routine compliance from self-reports.
- `created_at`, `updated_at`, `archived_at`.
- FK `(area_id,user_id)` references same owner's area via composite UNIQUE/foreign-key approach.

### `actual_observations`
- `id UUID PK`, `user_id UUID NOT NULL`, `metric_id UUID NOT NULL`.
- `value JSONB NOT NULL` validated by domain/schema boundary **plus** enforced database invariants.
- `observed_at TIMESTAMPTZ NOT NULL`; `created_at TIMESTAMPTZ NOT NULL`.
- `source ENUM('manual','import')` (manual MVP).
- `correction_of UUID NULL`, `superseded_at TIMESTAMPTZ NULL` or equivalent revision linkage to retain provenance.
- Optional `note TEXT`, stored privately; never log note text in telemetry.
- Composite FK enforces owner matching. Indexed `(user_id,metric_id,observed_at DESC,created_at DESC)`.
- **Current** = latest non-superseded observation by `observed_at`, then `created_at`, not necessarily the latest edited row. A user can backfill history without automatically changing today's current.
- Future-dated actuals default to reject/warn based on documented policy, not silently treat as current.

### `target_revisions`
- `id UUID PK`, `user_id UUID NOT NULL`, `metric_id UUID NOT NULL`.
- `value JSONB NOT NULL` with same type constraints as metric, and any target-specific comparator rule.
- `effective_from TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`.
- `superseded_at TIMESTAMPTZ NULL` / explicit revision ordering, optional `note`.
- A target edit creates a new revision, not an UPDATE of the original target value.
- Define deterministic target lookup `effective_from <= reference time` and revision tie-breakers; preserve target history during edits.
- Indexed `(user_id,metric_id,effective_from DESC,created_at DESC)`.
- MVP should avoid arbitrary overlapping validity windows; use transactional revisions.

## Typed values — illustrative JSON
```json
{"type":"number","amount":4,"unit":"friends"}
{"type":"money","amount":"2000.00","currency":"EUR","period":"month"}
{"type":"percentage","amount":"20"}
{"type":"boolean","value":true}
{"type":"frequency","count":2,"per":"week","mode":"reported_rate"}
```
Use fixed precision decimal serialization for money/percentage, not binary floating-point for accounting. Counts can be integer when the unit requires it. Validate e.g. percentages 0..100 for allocations, although future percentage use cases may need a different explicit range. Reject unexpected JSON shapes rather than guessing.

`frequency` may represent a user-entered reported weekly rate; **do not** claim verified events exist until an occurrence table is implemented. For event-derived routines, introduce `routine_occurrences` with timestamp, owner, metric, and coverage rules as a deliberate schema migration.

## Comparison semantics
- Numeric/money/percent: units, currencies and time bases must match before computing differences. `delta = target - actual` may be displayed as a descriptive signed difference; met/unmet depends on `comparison_operator`.
- `at_least`: actual >= target; `at_most`: actual <= target; `exact`: actual equals target (type-aware tolerance, if explicitly specified).
- Boolean: compare true/false; no percent or ordered "distance".
- Frequency: compare only matched `per` periods and same measurement mode, or explicitly describe self-reported nature.
- Missing actual or target: `unknown` / `not_configured`, never default zero.
- Time gaps: an old observation is `stale` only if a threshold is specified or user can see last-updated; stale does not imply failure.
- `insufficient_data` when occurrence coverage is incomplete.
- Higher or lower numeric values are not universally desirable; respect operator.
- Composite progress scores are not a default feature.

### Example pure TypeScript interface (illustrative, not implementation)
```ts
type MetricKind = "standard" | "goal";
type ComparisonStatus = "met" | "unmet" | "unknown" | "insufficient_data" | "stale" | "not_configured";
type Comparison = {
  status: ComparisonStatus;
  signedDelta?: string; // exact decimal or domain-formatted quantity
  explanationCode: string;
  observationAt?: string;
  targetEffectiveAt?: string;
};
```

## Calendar and time
Store instants as UTC timestamps, retain user timezone preference for calendar windows and display. Weekly interval start (e.g. ISO Monday) is a configurable domain decision; do not assume locale means the same start. Keep observation and entry timestamps distinct.

## Moving, archiving, deleting
Moving a metric changes `area_id`, not stable metric identity or recorded history. Archiving hides from active overview without deleting records. Account deletion removes owned content safely per retention policy. Export produces data in a documented versioned format before deletion.

## Migration and evolution
Every schema change must have up/down or explicitly recoverable migration plan, backfill strategy and compatibility tests. New value types use additive discriminators and explicit version-aware parsers. Sensitive free-text should not appear in generated fixtures.

## Required implementation tests
- Tenant isolation across every table and nested reference.
- Current-state derivation under backdated and corrected observations.
- Historical target reconstruction after edits.
- Compatible/incompatible units and "at most" semantics.
- Missing values, stale flags, money precision and zero targets.
- Moving and archiving without data loss.
