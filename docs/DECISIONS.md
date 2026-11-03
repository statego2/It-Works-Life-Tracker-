# Decision Register — It Works

Maintained to distinguish **confirmed product requirements**, **reversible technical recommendations** and **unresolved decisions**. Coding agents must not convert a recommendation into an implied product mandate.

## Confirmed by product owner — 2026-11-02
| ID | Decision | Status |
| --- | --- | --- |
| P-001 | Create any number of custom folders/areas. | Confirmed |
| P-002 | Each folder contains custom standards and goals. | Confirmed |
| P-003 | Each metric compares current real condition with user-defined desired condition, without rewriting the user's meaning. | Confirmed |
| P-004 | Actual/current appears visually **LEFT** and standard/goal visually **RIGHT** whenever shown side by side. | Confirmed |
| P-005 | Primary utility is the immediate **overall life snapshot**; suggestions and actions are secondary. | Confirmed |
| P-006 | Web/PWA first, with architectural readiness for native mobile later. | Confirmed |
| P-007 | Cloud database and accounts. | Confirmed |
| P-008 | Personal use first, generalizable design for any user. | Confirmed |
| P-009 | Preserve historical actuals and evolution of metrics. | Confirmed |
| P-010 | Final dashboard layout and visual design are a separate future discussion. | Confirmed |

## Confirmed by product owner — 2026-11-03
| ID | Decision | Status |
| --- | --- | --- |
| P-011 | Keep shipping the web app as a PWA. A later iPhone app is a Capacitor wrap of that same web app, not an Expo or React Native rewrite. | Confirmed |

## Proposed technology decisions — pending scaffold validation
| ID | Proposal | Rationale | Status |
| --- | --- | --- | --- |
| T-001 | Next.js/React/TypeScript web client | Productive web/PWA development; ecosystem | Superseded by ADR-001. The shipping client is the vanilla JavaScript PWA. |
| T-002 | Supabase Auth/PostgreSQL/RLS | Cloud auth plus relational schema and tenant controls | Proposed. A draft schema exists and is not connected to the app. |
| T-003 | Pure TypeScript domain package + explicit contracts | Native portability and isolated tests | Deferred. Current domain logic is plain JavaScript in `src/domain.js`, with no DOM. |
| T-004 | Later Expo/React Native client | Shares domain and services; native UI developed independently | Superseded by ADR-001. The iOS path is a Capacitor wrap. |
| T-005 | Vitest + Playwright + DB integration tests | Domain correctness, user journeys, RLS isolation | Partially adopted. Node's built-in test runner covers domain, backup and save behavior. Playwright covers the iPhone PWA smoke test. Postgres RLS smoke covers the draft schema. Vitest is not in use. |
| T-006 | Incremental monorepo structure | Can host web and shared packages without future extraction | Deferred. The PWA lives at the repository root and has no build step. |

## ADR-001 — Web-first PWA, then a Capacitor wrap for iOS
**Date:** 2026-11-03
**Status:** Accepted by product owner Dimitris

**Context.** P-006 already says web/PWA first, with a native-ready shape. T-001 proposed a Next.js client and T-004 proposed a later Expo / React Native client. The working app is a dependency-free vanilla JavaScript PWA (Greek UI, localStorage, GitHub Pages). Rewriting it in Next.js or React Native would throw away a working dashboard before the layout is even approved (P-010).

**Decision.**
- The product stays a web app first, installed on iPhone from Safari (Add to Home Screen) and served as a PWA.
- When a real iPhone binary is built, it will be a Capacitor wrap of this same web app, not Expo and not React Native.
- Do not start a Next.js rewrite or an Expo client unless a later decision replaces this one.
- Widgets, local notifications, Xcode signing and the Apple Developer Program are not part of this decision. They wait for the Capacitor phase.

**Consequences.**
- Domain rules stay in portable plain JavaScript (`src/domain.js`) so the WebView can reuse them.
- UI code stays the current HTML/CSS/JS. A Capacitor project would copy those static files; it would not replace them with React Native screens.
- Supabase (T-002) remains a proposal for cloud accounts. This decision does not connect it.
- GitHub Pages is the current public host. Two publishers are configured today (the legacy "Deploy from a branch" source on `main` `/`, and `.github/workflows/deploy-pages.yml`). Only one should publish. Switching the source to GitHub Actions is a repository setting and is recorded in the README; it is not changed from a pull request.

## ADR-002 — iOS storage file and home-screen widget (2026-11-03)
**Status:** Accepted as the implementation of ADR-001. The product owner approved the Capacitor wrap.

**Decision.**
- The iPhone app is a Capacitor 8 shell around the same static web files. `npm run cap:sync` copies those files. They are not rewritten in Swift.
- On iOS the workspace is a JSON file via Capacitor Filesystem (`Directory.Data`), not Preferences. Vision-board photos can be too large for UserDefaults. The website keeps using localStorage.
- The first native launch copies localStorage once if the file is still empty. A JSON backup import uses the same validation as the website and writes the native file.
- Starred goals for the widget are a small snapshot in the App Group `group.com.statego2.itworks`. Current is the left value and the target is the right value. The full workspace is not placed in the App Group.
- Reminders are scheduled on the device with Capacitor Local Notifications. There is no server. The website stores the reminder list and does not schedule a notification.

## ADR-003 — Three dashboard proposals, not a final layout (2026-11-03)
**Status:** Proposal for comparison. P-010 still stands: the final visual design is not approved.

The owner asked to compare looks before choosing one. The app can switch among three directions, stored on the workspace as `appearance.direction`: `sanctuary` (closest to a dark personal note), `health` (grouped iOS cards, light and dark), and `editorial` (serif, gold rule). Optional affirmations and four identity sections (ideal, life's work, mission, personal life) are user-written. They are empty until the user or the fictional demo fills them. None of the owner's private note text or photos is stored in this repository.

The owner rejected the tab shell and the crystal hero: they hid the folders. The home is again the original structure. Gold goals sit on top, then the user’s own folders, and each folder opens onto its goals. A goal is still a custom field (name, kind, measurement, unit, current on the left, target on the right). Notes, reminders, vision photos, export and restore stay where they were. Black, a restrained blue, and gold for starred goals are only a skin. A new install is empty: no sample purpose, no sample affirmations, and no decorative hero. The final layout is still not approved.

**Stack changes** may be made by implementers if justified with maintenance, security, deployment and portability trade-offs in an Architecture Decision Record (ADR).

## Open questions (defer without blocking foundation)
- UX composition of the dashboard, information hierarchy, and visual system.
- Whether self-reported frequencies suffice or occurrence tracking is essential for the first dogfooding period.
- Defaults for stale observation threshold, week start and timezone display.
- Whether targets may be ranges or multi-attribute states in first release.
- Whether specific subtypes (e.g. budget allocation categories, net income) belong in MVP.
- Public-release requirements, hosting, analytics policy, pricing and monetization.
- Offline reading/writes versus honest online-only first implementation.

## Change-control rule
Any decision changing P-001 through P-010 requires explicit product-owner approval. Technical changes can be made in a PR accompanied by tests, a rationale and a short ADR entry. Do not silently "improve" a user's chosen metric or introduce implied universal life norms.
