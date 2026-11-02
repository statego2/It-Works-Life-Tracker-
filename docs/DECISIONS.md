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

## Proposed technology decisions — pending scaffold validation
| ID | Proposal | Rationale | Status |
| --- | --- | --- | --- |
| T-001 | Next.js/React/TypeScript web client | Productive web/PWA development; ecosystem | Proposed |
| T-002 | Supabase Auth/PostgreSQL/RLS | Cloud auth plus relational schema and tenant controls | Proposed |
| T-003 | Pure TypeScript domain package + explicit contracts | Native portability and isolated tests | Proposed |
| T-004 | Later Expo/React Native client | Shares domain and services; native UI developed independently | Proposed |
| T-005 | Vitest + Playwright + DB integration tests | Domain correctness, user journeys, RLS isolation | Proposed |
| T-006 | Incremental monorepo structure | Can host web and shared packages without future extraction | Proposed |

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
