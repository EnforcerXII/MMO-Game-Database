# Verification record

Run on 2 November 2026 against an isolated MySQL 8.0.46 instance, Node.js 24.19, and Next.js 16.4.3. Integration requests used the running development app with `APP_ORIGIN=http://127.0.0.1:3000`. Test records are generated with random credentials. No existing user database was modified.

| Check | Observed result |
| --- | --- |
| Fresh DDL + DML | PASS: all tables, constraints, seed rows, triggers, function and transfer procedure loaded in a second disposable schema |
| Existing-schema migrations 011 → 012 → 013 | PASS: applied in order to the prior schema and example data |
| Anonymous management API calls | PASS: 401 across dashboard, players, guilds, matches, inventory, items, achievements, unlocks, rounds, participants and db-test |
| Admin login and player listing | PASS: bcrypt authentication and session cookie accepted; no password hash returned |
| PLAYER GET/POST/PATCH/DELETE on player-management endpoints | PASS: 403 |
| Account ID tampering | PASS: supplying another player_id still returns only the signed-in account |
| Banned account, password change, logout | PASS: protected requests rejected after each respective state change |
| Date fidelity | PASS: SQL birthday 2000-01-01 returned as exactly 2000-01-01, without timezone conversion |
| Direct SQL invalid-input checks | PASS: blank username, invalid email, future birthday, negative price, incompatible item subtype, negative quantity, missing item FK, reversed season dates, negative achievement points and self-friendship rejected |
| Item transfer | PASS: invalid-recipient failure rolls back debit; negative quantity rejected; full transfer removes sender row and credits recipient |
| Guild create/change leader/delete | PASS: complete HTTP lifecycle with foreign keys enabled |
| Origin/CSRF | PASS: foreign/missing origin rejected for login; authenticated cross-origin player mutation rejected |
| Request validation | PASS: wrong content type, malformed JSON, null/array bodies, wrong field types and oversized body rejected |
| Password byte limit | PASS: more than 72 UTF-8 bytes rejected before bcrypt |
| Login throttle | PASS: ten invalid attempts return 401; the next returns 429 with Retry-After |
| Response headers | PASS: nosniff, DENY framing, no-store and absent X-Powered-By verified |
| Important SQL examples | PASS: five read-only query groups executed, including joins, aggregate functions, HAVING and correlated subquery |
| Browser workflow | PASS: admin sign-in → dashboard → players → logout → player sign-in → own inventory/achievements → admin-page redirect |
| Production build | PASS: `npm run build` completes; all 25 static-page generation entries complete |
| Lint on new/changed application areas | PASS: command below, zero errors/warnings |
| Full repository lint | Existing failure: nine errors in older pages; see below |

## Reproduce automated checks

Follow the [setup guide](../README.md) using a disposable database. From `web` with the app running and the same DB environment:

```bash
node --env-file=.env.local tests/auth.test.mjs
node --env-file=.env.local tests/integrity.test.mjs
node tests/security.test.mjs
npx eslint app/api lib components app/account app/login scripts tests next.config.mjs app/layout.js
npm run build
npm run lint
```

Use `TEST_BASE_URL` to match your configured APP_ORIGIN if it differs from the default `http://127.0.0.1:3000`. The security suite intentionally creates a temporary throttle entry for a random nonexistent username. The integration suites remove their players, guilds and items in cleanup. Tests are not safe for production environments.

Browser verification used headless Chromium at 1440×1000 with disposable sample data. The account passwords were temporarily randomized in the isolated database, never written to screenshots, then restored. Repeat manually with your own accounts: sign in as ADMIN, confirm the dashboard and Players list; sign out and wait for the login page; sign in as PLAYER, confirm its inventory/achievements; navigate to `/players` and confirm redirection to `/account`. See [screenshots](project-report.md#application-screenshots).

## Known limitations and results not claimed

- Full lint has eight `react-hooks/set-state-in-effect` errors in the existing overview, players, guilds, matches, inventory and achievements pages, plus an unescaped apostrophe in the old `[section]` placeholder. Those pages were not rewritten as part of requirements 11–14. These are not production-build errors.
- Dependency installation reported 16 moderate advisories. No dependency upgrade or complete vulnerability remediation is claimed by this work; review the current audit before deployment.
- No production HTTPS/TLS deployment, penetration test, high-load concurrency test or multi-instance deployment test was performed. Production Secure-cookie/HSTS and remote DB TLS configuration are implemented but not exercised by these HTTP-local tests.
- Session expiration is enforced by the SQL lookup; the suite tests invalidation through account/password/logout changes, not waiting eight hours in real time. The transfer suite proves rollback and full-transfer behavior, not exhaustive concurrent schedules.
- Basic per-username throttling is not a substitute for deployment-wide rate limiting; unknown-username flooding and denial-of-service resistance need perimeter controls. Cleanup removes expired sessions and old counters.
- Role changes are trusted-operator actions. The nullable guild leader enables valid transactional creation, but direct privileged SQL can leave an incomplete guild; application workflows must be used for complete guild operations.
- There is no second database paradigm yet. Course requirement 3 is a known gap outside this change's requested scope.
