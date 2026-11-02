# Product Requirements — It Works: Life Tracker

**Status:** MVP specification v0.1. Prioritized functional behavior; visual dashboard design not frozen.

## Product vocabulary
- **Area/Folder:** a user's custom container.
- **Metric:** a standard or goal inside exactly one area.
- **Standard:** a recurring/ongoing desired condition.
- **Goal:** a desired achievement, condition or milestone.
- **Target:** typed desired value or rule.
- **Actual observation:** typed record of what was true / recorded at a particular time.
- **Current:** latest valid observation (or unknown), never the user's target.
- **Comparison:** transparent evaluation of actual versus desired, including insufficient information.

## P0 — MVP functional requirements
### Accounts and ownership
- Users can sign up/in, sign out, and only retrieve or mutate their own records.
- A new account has an empty workspace. Sample templates are **opt-in**, never forced or personalized.
- Server-side authorization must never trust user-supplied ownership IDs.

### Folder management
- Create, rename, reorder, archive/restore user-defined areas.
- Any folder name and any number of folders within reasonable technical limits.
- A folder groups metrics but does not dictate their types.
- Moving a metric to another folder retains its history.

### Standard/goal management
- Create, edit, reorder, archive, restore a metric in a folder.
- User-authored title and optional description preserved exactly (except safe formatting/sanitization).
- Type is Standard or Goal and is visible in UI.
- Store desired state independently of current actual.
- MVP supports **number**, **money with currency**, **percentage**, **boolean**, **frequency per time period**.
- Optional unit and direction: at least, at most, exactly, yes/no; numeric validation must respect the chosen rule.
- Do not normalize "close friends" to "social connections" or reinterpret a relationship status.
- Type changes with existing observations must be migrated explicitly, not silently coercing recorded history.

### Actual-state tracking
- Current may be unspecified: show "not recorded" or equivalent.
- Log/update actual values with observation timestamp and creator identifier.
- Users can view the last actual and chronological history.
- Editing an incorrect entry creates an auditable correction or maintains revision history rather than destroying provenance.
- Users can enter historical dates with timezone-aware handling.
- All writes enforce schema and numeric bounds at the boundary.

### Target tracking
- Edit target values separately from actual values.
- Keep target history with validity timestamps.
- Existing actual measurements are not rewritten when the target changes.
- History can show what the user wanted at a selected point in time.

### Comparison and overview
- Home summarizes all folders/metrics: what was recorded, what is desired, and appropriate status.
- **In every side-by-side view: Actual/Current on the LEFT and Target/Standard or Goal on the RIGHT.**
- Clearly distinguish: met, not met, unknown, not enough history, and stale where defined.
- Quantitative gap uses matching units/currency, rule direction and window.
- Boolean gap is a condition mismatch, never an artificial numeric deficit.
- No forced single "overall life %" score.
- Standards with a time window need occurrence/window evidence; a single declaration "1 per week" can be treated as **self-reported frequency**, explicitly labeled, not verified occurrence tracking.
- A target of zero, absent denominator, inverse goals and lower-is-better goals must not trigger misleading divide-by-zero progress calculations.
- Overview and detail layouts are open for future UX design. Directionality is the only locked visual placement requirement.

### Practical UX
- Mobile-responsive web first.
- Fast add/edit interaction; no repeated setup burden.
- Accessible forms, keyboard navigation, clear errors, empty states, loading and saved/unsaved feedback.
- User can opt in to reminders later; do not build notification pressure into MVP.

## P1 — After MVP
- Flexible notes, attachments, milestones and dependencies.
- Optional weighting and importance chosen by user.
- Selectable trend windows, baseline comparisons and data visualizations.
- Export/import, sophisticated account recovery and self-service deletion if not already complete.
- Calendar recurrence tracking instead of only self-reported weekly frequency.
- Optional next actions and priority planner.
- Explicit budget-allocation models with validation of shares and gross/net assumptions.

## P2 — Exploratory
- Scenario modeling and 5-/10-year planning; transparent assumptions and confidence.
- AI suggestions grounded in user-defined standards, requiring user review.
- Native iOS/Android clients powered by shared domain models and typed backend boundaries.
- Third-party integrations if privacy, permissions and user value justify them.

## MVP acceptance scenarios
1. Starting from an empty account, create "Relationships," add count standard "Close friends available for frequent meetings," enter current=1 and target=4. It appears as **1 left, 4 right** with 3-unit shortfall.
2. Add a boolean goal "Has a partner": current=no, target=yes. Show mismatch without percentage and without moral commentary.
3. Create folder "Spirituality," add weekly fasting frequency current=1/week, target=2/week. UI makes clear it is self-reported frequency unless occurrence logging actually exists.
4. Add a financial target current=€100/month, desired=€2,000/month; do not compare incompatible periods or currencies.
5. Change desired count from 4 to 3. Earlier target version and observations remain accessible.
6. Move a metric from folder A to B. All observations persist.
7. Log two actual measurements on different dates. Latest is shown; history contains both.
8. Create user A and user B. User B cannot read/write A's areas, metrics, observations, targets or exports, even with guessed IDs.
9. New metric with no actual value displays **unknown**, never 0.
10. Access the responsive home on small screens: current remains visually left of desired where cards compare; on unavoidable vertical layouts, current precedes target in reading order.
11. Archived metrics do not vanish from history and can be restored.
12. User-authored custom folders and indicators work with no hardcoded life-domain enum.

## Nonfunctional requirements
- Reasonable performance and pagination/indexes for growing histories.
- Idempotent mutations where practical; concurrency-safe target editing.
- Versioned migrations and documented rollback.
- Tests for core comparison/domain behavior and account data isolation.
- Privacy by default; no public sensitive data or unapproved analytics.
- PWA installability and clearly documented offline limitations; **offline writes must not be presented as synced**.
- Minimum supported browser list to be confirmed during scaffold; progressive enhancement over fragile device-specific behavior.

## Open product questions, deferred on purpose
- Detailed dashboard visual composition, charts and typography.
- Whether to introduce composite scores or optional custom priorities.
- Which calendar/weekly boundary and whether routine actuals become event-based in MVP.
- How much of export/deletion ships with private alpha vs before public beta.
- Release/monetization strategy.

User-approved behavior above outranks aesthetic suggestions by coding agents.
