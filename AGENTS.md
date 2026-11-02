# AGENTS.md — Mandatory AI Coding Agent Instructions

This file governs all automated or human-assisted coding work in this repository. It is a **product contract**, not merely style guidance.

## 0. Read before editing
In order:
1. `README.md`
2. `PROJECT_CHARTER.md`
3. `PRODUCT_VISION.md`
4. `PRODUCT_REQUIREMENTS.md`
5. `ARCHITECTURE.md`
6. `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, `docs/DECISIONS.md`
7. `ROADMAP.md` and `docs/TEST_STRATEGY.md`

If something is unclear, take the smallest **reversible** interpretation consistent with these documents, explain it in the PR, and do not invent new user values.

## 1. Unbreakable product invariants
- Users, **not AI agents**, define life areas/folders and metrics.
- A folder holds any number of user-defined **standards** and **goals**.
- A metric's **Current** state is separate from the user's **Standard/Goal** target.
- In every two-column comparison, **CURRENT IS LEFT; TARGET IS RIGHT**. On stacked layouts, Current must precede Target. Do not reverse these.
- Respect the exact meaning of custom metric labels. E.g. "close friends available to meet frequently" is not interchangeable with "social connections."
- Relationships, spiritual practice, financial standards, health and other personal metrics are legitimate when **the user** chooses them. Do not filter or overrule them based on agent preferences.
- Missing data is **unknown**, not zero, not a failed habit, not a negative life judgment.
- Different units/types are **not** merged into a scientifically unsupported universal life score.
- The app's primary function is a truthful **whole-life overview**; advice, priority suggestions, planning and AI are secondary and optional.
- Maintain actual observation history and target revision history separately.
- The dashboard's **detailed look and layout are NOT approved**. Do not invent a fixed visual design or treat a prototype as final.

## 2. Engineering quality bar
This is intended to become a real, maintainable consumer application if validated. **Never build a throwaway demo architecture** or hardcode the product owner's life as code.

Preferred architecture:
- Next.js/React/TypeScript PWA web client (initial).
- Cloud authentication and PostgreSQL with RLS (Supabase recommended).
- Portable TypeScript domain and schema/contracts packages, no Next/React dependency in pure domain logic.
- Versioned migrations and tenant-safe DB ownership.
- Future native iOS/Android via Expo/React Native consuming shared contracts/domain with a different UI.
- Modular boundaries and automated tests; use actual, supported provider APIs and confirm versions from installed dependency docs.

These are proposed technology choices, **not a reason to stall**. An equivalent approach is acceptable if documented in `docs/DECISIONS.md` and approved where it changes product promises.

## 3. Working method for every task
1. Inspect current files, active branch, open relevant instructions and existing implementation. Do not assume a blank repository once code exists.
2. State the user-visible result the task will deliver and its acceptance tests.
3. Implement a **small end-to-end vertical slice**. Prefer functional flows over a sprawling scaffold or a pile of speculative abstraction.
4. Add schema/type/domain tests and, for auth/data changes, cross-account negative tests.
5. Run available lint, typecheck, unit/integration/E2E tests; report exact results. Do not fabricate output.
6. Use sensible commits; open a PR for significant changes unless specifically directed otherwise. Keep changes isolated and easy to review.
7. Update docs when any supported behavior, schema or architectural decision changes.
8. Report what works, what does not, what remains unverified and the next practical task.

## 4. Ownership & sensitive information
- This is a **public repository**, and example values must be **fictional and anonymous**.
- Do **not** commit actual financial figures, personal relationship situations, health information, religious routines or identifying personal details as user seed data.
- Never commit tokens, passwords, .env files, DB connection strings, private API keys or production data.
- All user-owned tables must enforce authentication and RLS; never rely only on frontend filtering.
- Foreign keys must not permit creating cross-account associations.
- No unapproved telemetry or AI calls with private content.
- Protect cached data on logout and multi-account usage.

## 5. Domain correctness requirements
- Keep `kind` (standard/goal) separate from `value_type` (number/money/percentage/boolean/frequency).
- Support `at_least`, `at_most`, `exact`, and boolean equality semantics appropriately.
- Include units, currency, time bases, timezone and provenance with observations.
- A "weekly frequency" can be a self-reported rate; do not represent it as verified completion events without records.
- When targets change, create a new version rather than rewriting history.
- Backdated entries should not incorrectly become current solely because they were entered most recently.
- Never divide by zero in progress calculations or imply all gaps have comparable numeric distance.
- Distinguish `unknown`, `unmet`, `met`, `stale`, and `insufficient_data`.

## 6. MVP-first / defer
**Build first:** secure account, custom folder, custom standard/goal, typed target, actual observation, history, honest overview.

**Do not build without direction:** 30 modes, elaborate charts, social features, AI coaching, financial prediction engine, native clients, arbitrary dashboard theme, gamified life percentage, payments or premium plans.

Do not confuse a well-designed concept page with working software. Do not claim a successful deployment, auth integration or sync without testing it.

## 7. Native-ready means portability, not premature mobile development
- Domain computation in pure TypeScript independent of Next.js.
- Typed backend contracts; explicitly version breaking API changes.
- Auth/DB/device integration through adapters or contained services.
- Platform UI concerns remain in the app layer.
- Eventually mobile can reuse rules and validation but **not** necessarily web layout/components.
- Maintain export and migration paths. Record irreversible trade-offs.

## 8. Conflict resolution
**Hierarchy:** latest explicit product-owner instruction > confirmed product decisions (`docs/DECISIONS.md`) > product requirements/charter > architecture proposal > developer convenience. If a request conflicts with a confirmed invariant or privacy/security, surface the conflict and offer a reversible implementation. Do not silently discard requirements.

## 9. Definition of done
A change counts as complete only when functioning code exists, affected behaviors are testable, checks were actually executed, no privacy regressions were introduced, and documentation reflects current reality. Infrastructure features require verified environments and evidence. If blocked, provide a precise blocker and meaningful partial work, not invented success.

**Default next task:** start `ROADMAP.md` Ticket 001 (executable workspace scaffold + pure domain comparator and tests), then progress through releases by vertical slice. Do not immediately build a speculative full dashboard.
