# Development Roadmap — It Works: Life Tracker

**Principle:** ship small, correct, end-to-end slices. Do not mistake documents or polished screenshots for a working product. Dates and effort estimates are deliberately not committed.

## Release 0 — Product foundation (documentation)
**Deliverables**
- [x] Project charter and product vision
- [x] Product requirements and explicit MVP acceptance scenarios
- [x] Proposed native-ready architecture and typed data model
- [x] Security/privacy requirements and implementation testing plan
- [x] AI agent working contract
- [x] Decision log distinguishing product requirements from recommendations

**Gate:** all required product decisions captured; dashboard composition remains open.

## Release 1 — Real application scaffold
**Deliverables**
- [x] Working web client: the vanilla JavaScript PWA at the repository root (ADR-001). A Next.js rewrite is not the current path.
- [x] Pure comparison logic in `src/domain.js` (no DOM) with unit tests. A separate TypeScript package is deferred.
- [x] Responsive Greek UI, empty states and an explicit local-only warning. Final visual design remains open (P-010).
- [x] `npm test`, `npm run check`, Playwright iPhone smoke test and GitHub Actions.
- [x] README development instructions with actual commands.
- [x] PWA manifest, PNG home-screen icons and a service worker that caches the app shell only (not private workspace data).
- [ ] Authenticated cloud persistence. The app is still local to one browser.

**Acceptance gate:** fresh clone can install, run, typecheck, lint and test with documented commands. Test or demo must not require production secrets.

## Release 2 — Accounts + safe cloud persistence
**Deliverables**
- [ ] Provision a separate development database/auth project; document provider setup steps without committing secrets.
- [ ] Add SQL migrations, RLS and tenant-safe foreign keys.
- [ ] Implement sign-up/sign-in/sign-out and private empty workspace.
- [ ] Test unauthorized requests, cross-account isolation and logout cache clearing.
- [ ] Add local/dev seed with clearly fictional content, not personal information.

**Acceptance gate:** account A and account B can never read or alter each other's rows, including by guessed foreign keys; tests enforce it.

## Release 3 — Life areas and metric definitions
**Deliverables**
- [ ] CRUD and archive/restore/reorder for custom folders.
- [ ] CRUD and archive/restore/reorder/move for standard and goal metrics.
- [ ] Typed target input for number, money, percentage, boolean, self-reported frequency.
- [ ] Explicit unit/comparator validation and clear handling of missing values.
- [ ] Accessible, mobile-responsive form flow.

**Acceptance gate:** a user defines a completely custom folder and metrics without any hardcoded domain category.

## Release 4 — Actual observations + history
**Deliverables**
- [ ] Log current actuals with observed timestamps.
- [ ] Store append-only observations with revision/correction semantics.
- [ ] Maintain target revisions and render their histories.
- [ ] Timezone-aware current derivation, including backdated entries.
- [ ] Handle loading, saving, conflict and no-history cases truthfully.

**Acceptance gate:** two observations and one target edit persist; opening again shows the correct latest current and historical values.

## Release 5 — Whole-life overview (first actual product experience)
**Deliverables**
- [ ] Working overview across folders and metrics, plus drill-down.
- [ ] Current on **LEFT**, Standard/Goal on **RIGHT** in side-by-side views.
- [ ] Pure typed comparison engine: met/unmet/unknown/insufficient/stale when applicable.
- [ ] Correct gap semantics for number, money, percent, boolean and frequency.
- [ ] High-quality responsive and accessible experience with truthful offline messaging.
- [ ] End-to-end coverage of all `PRODUCT_REQUIREMENTS.md` P0 scenarios.

**Acceptance gate:** owner can open the app and meaningfully answer "Where am I right now compared with the life I've defined?" without spreadsheet work or explanations. **Final dashboard styling/layout will be decided in a separate UX discussion**, so do not prematurely ossify a mockup.

## Release 6 — Private alpha / personal dogfooding
**Deliverables**
- [ ] Staging deployment and verified production-like migration procedure.
- [ ] Verify PWA installation on intended devices; implement or explicitly limit offline behavior.
- [ ] Data export pathway and account deletion specification; complete before broader release.
- [ ] Measure friction, time to update, accuracy of overview, return usage.
- [ ] Fix real-life issues uncovered through use before adding intelligence features.

**Acceptance gate:** actual longitudinal usage validates that updates are manageable and the summary is genuinely useful.

## Release 7 — Public product readiness (conditional)
- [ ] Public landing/onboarding, privacy notices, legal review, user support and operational monitoring.
- [ ] Security assessment, backup/restore drills, retention/deletion verification and production incident plan.
- [ ] Data migrations/versioning and accessibility review.
- [ ] Cost and usage monitoring, production SLO definitions, sustainable operations.
- [ ] Release strategy based on verified user need; monetization not assumed.

## Release 8 — Optional expansion, not MVP blockers
- [ ] User-selected priorities, next action suggestions, dependency mapping.
- [ ] Milestone timelines and optional 5-/10-year scenarios with transparent assumptions.
- [ ] User-authorized reminder and recurrence engines; event-based completion tracking.
- [ ] iPhone app as a Capacitor wrap of this PWA (ADR-001), including later reminders and widgets. Not Expo or React Native.
- [ ] Opt-in AI features with privacy protections and explainable reasoning.
- [ ] Optional integration/import tools.

## Strict working order
1. Architecture and isolated domain primitives.
2. Identity, data ownership and secure persistence.
3. Folder and metric definition end-to-end.
4. Observation and versioned-target tracking.
5. Actual overview experience.
6. Private user test and iteration.
7. Enhancements after measured evidence.

Any agent proposing a major deviation should document why, what is delayed, and how to roll back.

## Definition of done for a coding task
- Real source files and tests committed (or a clear description of an actual blocker).
- All affected requirements and domain rules still hold.
- Static checks and appropriate tests run; actual command results reported.
- Security checks when ownership/schema/auth are changed.
- No invented claim of deployed URL, PWA installability, authentication or synced data.
- PR description includes what was built, how to verify, limitations and next concrete steps.

## First development ticket
**Ticket 001 — Executable scaffold + pure comparison domain** — done in the vanilla JavaScript PWA (`src/domain.js`, `tests/domain.test.js`, GitHub Actions). Do not restart it as a Next.js or TypeScript scaffold. Later iPhone work follows ADR-001 (Capacitor wrap), not Expo.
