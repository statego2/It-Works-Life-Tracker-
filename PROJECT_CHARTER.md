# Project Charter — It Works: Life Tracker

**Status:** Approved product direction; technical implementation pending  
**Established:** 2026-11-02  
**Product owner:** Repository owner  
**Initial customer:** Product owner (dogfooding), with a generalized design for future users

## Mission
Help people see, accurately and at a glance, the difference between **the life they are actually living** and **the life they personally want**. Organize self-defined life areas, standards and goals, track real-world changes over time, and optionally turn visible gaps into user-controlled action.

**Promise:** Your life. Your standards. Your progress.

## Problem
Conventional habit, goal and budgeting trackers fragment a person's life into predefined categories, overemphasize checklist completion, or prescribe how a good life should look. A person wants a single self-authored model of their current condition and chosen ideal across arbitrary domains, including quantitative and yes/no conditions, without software judging the legitimacy of the chosen standards.

## The primary experience
1. The user creates any number of **folders / life areas** and names them.
2. Inside each area, the user creates **standards** (ongoing conditions) and **goals** (desired milestones).
3. For every item, the user defines a **desired state** and records a **current state**.
4. Opening the app gives a truthful **overall view** of current versus desired states, including gaps, achieved conditions, unknown/stale observations and history.
5. Action suggestions, priorities, scenario planning and 5/10-year projections may be added later. They are **secondary to visibility** and never automatically supersede the user's priorities.

## Non-negotiable product principles
- **User sovereignty:** the user authors the indicators and the desired values. No artificial category taxonomy or AI reinterpretation may invalidate them.
- **Current is left; target is right** whenever the two are displayed side by side (including RTL-aware implementations where the visual order must remain consistent with this requirement).
- **No presumed universal life score:** comparing domains with different units must not imply scientifically justified equivalence.
- **Reality first:** unknown, missing, stale or not-yet-logged must not be silently displayed as zero, failure or success.
- **Respect mixed measurement types:** count, money, percentage, yes/no, frequency, qualitative and milestones are legitimate.
- **History is real:** historical observations are retained; changing a target does not rewrite the past.
- **Private by default:** personal data belong to the account holder and should be exportable and deletable.
- **Product-quality foundation:** build a working PWA first, with clear domain boundaries reusable for future native mobile clients.
- **No premature dashboard design:** its precise visual layout is a separate design decision. Implement only the established structural behavior.

## Scope
### MVP included
- Account login and private workspace.
- User-managed folders (create, rename, reorder, archive/delete safely).
- Create/edit/archive/reorder standard and goal metrics with typed desired values.
- Update current observations and view the latest known state.
- Time-stamped history for observed values and target revisions.
- Overview across all folders, plus detail view per folder and metric.
- Obvious direction and difference where mathematically valid; honest nonnumeric statuses elsewhere.
- Basic account export and delete design (implementation before public release).
- Responsive and accessible web app with verified PWA baseline.

### Explicitly out of MVP
- Automated AI coaching or compelled lifestyle optimization.
- Marketplaces, social comparison, gamification of personal worth.
- Bank, medical, calendar, dating or chat integrations.
- Native App Store releases.
- Complex 5/10-year forecasting, macroeconomic engines and automated priorities.
- A single algorithm deciding what the user's relationships or spirituality should look like.

## Success criteria
**MVP completion** requires a real authenticated user to: make a folder; create arbitrary standards/goals (numeric, boolean and weekly frequency); fill current and desired states; edit each independently; return later to see an accurate overview; view earlier observations; and confirm account separation through automated tests. A PWA must pass actual installation/offline-state checks appropriate to the implemented experience, not just contain a manifest.

**Dogfooding validation (non-binding targets):** use the product for two weeks, observe whether updates are quick enough to do naturally, and whether the overview answers "Where am I relative to what I want?" without explanation. Record friction and user feedback before adding optional intelligence features.

## Risks and mitigations
- **Overbuilding:** ship an end-to-end slice before analytics/AI/advanced dashboards.
- **False precision:** make scores optional, named, and explain weighting; default to raw comparisons and individual statuses.
- **Sensitive data:** tenant-level database protection, minimal telemetry, explicit export/delete, no personal information in code or logs.
- **Mobile rewrite:** framework-independent domain functions, shared schemas and testable APIs.
- **Routines vs snapshots:** model recurring standards and actual occurrences distinctly; do not infer that an unaudited week has 0 completions.
- **Stale values:** visible last-updated timestamps and staleness rules where appropriate.

## Governance
Product owner approves changes to product behavior and UX constraints. Coding agents can choose reversible implementation details but must document stack decisions, trade-offs and breaking changes in `docs/DECISIONS.md`. No agent should silently expand requirements or reinterpret user standards.

## Definition of done
For each increment: documented requirements, typed domain model, access-control implications, automated tests, useful empty/error/loading states, responsive and accessible interaction, migration strategy for schema changes, and a manual verification note. Claims about live infrastructure require evidence.
