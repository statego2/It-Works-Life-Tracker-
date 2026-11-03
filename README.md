# It Works — Life Tracker

**Your life. Your standards. Your progress.**

A personal life dashboard that compares **current reality** with **self-defined standards and goals** across any number of user-created areas (folders). The product must never decide which life a person *should* want.

> Status: **Working local-first Web/PWA prototype** with folder and goal tracking, per-metric progress, gold goals, manual ordering, history, personal notes, vision board and portable JSON backup/restore. **No working cloud sync or sign-in yet.** An RLS-tested draft cloud schema exists, but it is not connected to the app.

## Run the existing app

Visit [the published GitHub Pages prototype](https://statego2.github.io/It-Works-Life-Tracker-/) or run locally:

```bash
npm run dev
npm run check
npm test
npm run test:e2e
```

`npm run test:e2e` needs Chromium for Playwright once: `npx playwright install chromium`. It drives the app at an iPhone-sized viewport.

The app stores data in the **current browser's localStorage**. This is not a secure cloud account. The Settings menu includes **Export** and **Restore backup**; save a copy before clearing browser data. Vision images are compressed and stored locally, so keep exports small. Do not add highly sensitive information until authenticated, private cloud storage is implemented and verified.

Tests run in GitHub Actions, including an isolated PostgreSQL 16 two-account RLS smoke suite for the *future* cloud schema. The database schema is not installed in a production project.

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
| [FEATURE_IDEAS.md](FEATURE_IDEAS.md) | Living product ideas and inspiration |
| [docs/CLOUD_IMPLEMENTATION_STATUS.md](docs/CLOUD_IMPLEMENTATION_STATUS.md) | Prepared backend schema vs actual implementation |

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

## GitHub Pages

The site is published from `.github/workflows/deploy-pages.yml`, which copies the runtime files (all of `src/`, icons, the manifest and the service worker) and fails if the app references a file that is not in that folder.

The repository setting **Settings → Pages → Build and deployment → Source** is still **Deploy from a branch** (`main` `/`). That legacy publisher and the Actions workflow both run on every push to `main`, and whichever finishes last becomes the live site. A pull request cannot change that setting. To keep a single publisher:

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not "Deploy from a branch").
4. Save if GitHub shows a save button.
5. On the Actions tab, confirm that **pages build and deployment** no longer starts on push, and that **Publish It Works to GitHub Pages** does.

Until that click, both publishers include the runtime files, so a race should no longer blank the app. It can still replace one deploy with the other.

## Next implementation target

Complete a real **authenticated API and secure cloud adapter** with migrations and tested account isolation, keeping the existing browser data portable. The confirmed iPhone path after this PWA is a **Capacitor wrap of the same web app** (see ADR-001 in [docs/DECISIONS.md](docs/DECISIONS.md)), not Expo. Widgets and notifications stay a later Mac/Xcode phase. See [ROADMAP.md](ROADMAP.md) for the intended progression.