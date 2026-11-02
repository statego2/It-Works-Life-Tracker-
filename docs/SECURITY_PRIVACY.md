# Security & Privacy Guardrails

**Status:** development requirements, not a statement that security has already been implemented or audited.

## Threat model
The app may hold deeply personal data: financial condition, friends, relationship status, health goals, spiritual routines and other custom domains. Leakage, cross-account access, misleading sync status, account takeover and retention without consent are high-impact risks.

## Mandatory controls
1. **Authentication:** use a well-supported auth provider, secure sessions, appropriate redirect validation, server-side validation and rate limiting for sensitive endpoints.
2. **Owner isolation:** every user-owned DB table has `user_id` and enforced RLS; owners cannot supply arbitrary tenant IDs as proof of authority.
3. **Relational isolation:** prevent creating a metric pointing to another user's folder or an observation pointing to another user's metric. Use composite foreign keys and/or validated same-owner constraints, not RLS alone.
4. **Least privilege:** app users get only necessary access; privileged service keys stay in server environment, never frontend code or CI log output.
5. **Input validation:** type/length/range validation and output encoding; sanitize rich text. Parameterize queries; use constrained SQL policies.
6. **Sensitive-by-default:** avoid third-party tracking of titles, notes, targets, budgets, friends, relationship values, health or religious indicators.
7. **Encryption:** TLS in transit, encrypted cloud storage at rest where the provider supports it; secrets managed separately and rotated if exposed.
8. **Recovery:** clear error handling, backup/restore procedures, tested migrations and restoration strategy before public release.
9. **Account management:** provide clear access to export and deletion, document handling of backups and legal retention; comply with GDPR/other applicable privacy obligations before public launch (seek legal review, do not treat this file as legal advice).
10. **No false privacy claim:** tests and configuration checks must pass before promising data isolation or production security.

## RLS policy design
Enable RLS on `areas`, `metrics`, `actual_observations`, `target_revisions` and future tables. SELECT, INSERT, UPDATE and DELETE policies should rely on trusted authenticated user identity (e.g. `auth.uid() = user_id`). Never let service-role operations bypass intended authorization for public API actions. Make schema ownership references impossible across tenants.

### Negative tests (minimum)
- User B cannot SELECT an area belonging to A by known UUID.
- User B cannot UPDATE/DELETE A's metric.
- B cannot INSERT a metric under A's area, even with B as `user_id`.
- B cannot INSERT an observation or target revision for A's metric.
- B cannot access another user's histories via exports, joins, APIs or analytics.
- Anonymous access cannot read private records.
- Auth session expiration does not leave cached private data accessible on another account.

## PWA and client storage
- Treat HTTP caches, service workers and local storage as possible leakage surfaces.
- Do not cache sensitive API responses in shared/static caches; set appropriate Cache-Control.
- Never persist refresh tokens or sensitive records into unprotected arbitrary stores without assessing threat trade-offs.
- Logout must clear user-scoped cached state; cross-user switching cannot reuse the previous user's private data.
- Offline use is optional and security-critical: MVP may use online-only private data with an honest offline screen; do not advertise offline write/sync until conflict handling exists.

## AI agents / external providers
- Do not send private user content to external LLMs by default.
- If AI suggestions are later offered, they are opt-in with clear data sharing disclosure, minimization and provider evaluation.
- Do not place personal examples, credentials, production DB URLs, or PII in public GitHub code/issues/PRs, logs, tests or screenshots.
- Never print secret environment variables to debugging output.

## Public release checklist
- Document data controller, privacy policy, terms and jurisdiction-specific requirements.
- Verify RLS cross-tenant negative tests in CI against real database semantics.
- Review dependency vulnerabilities, authentication flows, session/logout, abuse controls and CSP/security headers.
- Test export, deletion and backup retention. Document incident response.
- Conduct threat-model review and independent security review proportional to launch scale.
