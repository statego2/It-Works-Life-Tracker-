# It Works — Life Tracker

**Your life. Your standards. Your progress.**

A personal life dashboard that compares **current reality** with **self-defined standards and goals** across any number of user-created areas (folders). The product must never decide which life a person *should* want.

> Status: **Product foundation / documentation only**. No application, backend, deployment, or working authentication has been built yet.

## Confirmed product decisions (2026-11-02)

- **Web/PWA first; native-ready** architecture for eventual iOS/Android apps.
- **Cloud account + database**, with private data isolated per user.
- **Personal dogfooding first**, but generalized product model suitable for any user.
- **Historical tracking** of actual values and changes to targets.
- **User-created folders (areas)** containing arbitrary **standards** and **goals**.
- Every metric has **current state** and **desired state**, supporting numbers, money, percentages, booleans, frequencies, and later qualitative/custom types.
- **Current on the LEFT; Standard/Goal on the RIGHT** in side-by-side comparisons. This is a firm product requirement; the final dashboard layout is **not decided yet**.
- Core value: **accurate whole-life visibility**. Recommendations and planning are secondary, optional, and user-directed.

## Start here

| Document | Purpose |
| --- | --- |
| [PROJECT_CHARTER.md](PROJECT_CHARTER.md) | Mission, scope, principles, success criteria, governance |
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Desired experience, differentiation, non-goals |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Behaviors, user stories, MVP acceptance criteria |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Proposed tech stack, boundaries, native-ready approach |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database entities, history, validation, ownership |
| [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) | Privacy, RLS, account security and safe defaults |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Confirmed decisions vs technical proposals vs open questions |
| [ROADMAP.md](ROADMAP.md) | Incremental delivery plan and measurable completion gates |
| [docs/TEST_STRATEGY.md](docs/TEST_STRATEGY.md) | Tests, CI gates, cross-account isolation |
| [AGENTS.md](AGENTS.md) | Mandatory implementation contract for AI coding agents |

## Domain language

- **Area / Folder**: A fully user-defined life domain; never hardcode required areas.
- **Metric**: A measurable or checkable item under an area.
- **Standard**: A condition/routine the user wants maintained (e.g. twice a week).
- **Goal**: A state or milestone the user wants to reach (e.g. a certain income).
- **Current**: Most recent known actual observation, never a fabricated live measurement.
- **Target**: Desired value or condition, defined and editable by the user.
- **History**: Time-stamped actual observations and versioned target changes.

## Build policy

1. Read **AGENTS.md** and the product docs before touching implementation.
2. Deliver small end-to-end vertical slices with tests rather than disconnected mockups.
3. Preserve separations between domain rules, persistence, and presentation so future native clients can reuse core logic.
4. Never seed real personal financial, romantic, religious, or health information into public repository files or demos. Use clearly fictional sample data.
5. Do not declare the app live, synced, secure, or PWA-installable until those behaviors are implemented and verified.

## First implementation target

A signed-in user can create an area, create a standard or goal, set current and desired values, update actual values without losing history, and view **Current → Target** side by side. See [ROADMAP.md](ROADMAP.md) for the sequence.

Architecture and stack selections remain proposals until proven in a working scaffold.