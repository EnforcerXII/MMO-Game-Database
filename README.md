# Arena Ops — MMO Game Database

A Next.js management interface backed by MySQL for players, guilds, matches, inventory and achievements. Admins manage game data; players sign in to view only their own inventory and achievements.

## Setup

Requires Node.js 20.9+ (tested with 24.19), npm, and MySQL 8.0.16+ (enforced CHECK constraints). Use a disposable database for examples and tests.

### New database

**The fresh-install DDL drops and recreates `arena`. Do not run it against data you want to keep.** From the repository root:

```bash
mysql -u root -p < mmo_database_ddl_mysql.sql
mysql -u root -p < mmo_dml.sql
```

The DML contains example data, triggers, a function and a procedure; run once after fresh DDL. Sample password hashes are not documented sign-in credentials. Create your own account below. Binary-logged MySQL servers may require a DBA to install the stored function under their routine-creation policy.

### Existing database

Back up first. Apply each once, in order, using a migration account:

```bash
mysql -u root -p < database/migrations/011_authentication.sql
mysql -u root -p < database/migrations/012_integrity.sql
mysql -u root -p < database/migrations/013_security.sql
```

Do not apply migrations after fresh DDL: the new tables and constraints are already included. Migration 012 rejects incompatible existing data rather than silently correcting it. MySQL DDL commits implicitly, so if a migration stops partway, inspect which statements succeeded before resuming; it is not an all-or-nothing migration runner.

### Application

```bash
cd web
npm ci
cp .env.example .env.local
```

Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME. Use a dedicated database account with SELECT, INSERT, UPDATE and DELETE on `arena`; the web runtime needs no schema-changing permissions. Put real credentials only in ignored local environment files or inject them through the deployment secret manager. Never commit them. Set `APP_ORIGIN` to the exact browser origin, including scheme and port, without a trailing slash (for example `http://localhost:3000`).

Bootstrap an admin using an operator's database environment. This Bash example keeps the password out of source files and command history:

```bash
read -r -s -p 'New account password: ' AccountPassword
printf '\n'
printf '%s' "$AccountPassword" | node --env-file=.env.local scripts/create-account.mjs ArenaAdmin admin@example.com 2000-01-01 ADMIN
unset AccountPassword
npm run dev
```

Choose your own username, email and birthday. Passwords need at least 8 characters and at most 72 UTF-8 bytes. Use PLAYER instead of ADMIN to bootstrap a player, or use the admin Players form (which always creates PLAYER accounts). Role promotion is an operator-only database action; clients cannot self-promote.

Visit the configured origin at `/login`. For production use `npm run build` and `npm start`, HTTPS and the exact HTTPS APP_ORIGIN; cookies are Secure in production. Enable `DB_SSL=true` for remote MySQL and optionally set `DB_SSL_CA` to a trusted CA file path. The local bootstrap script is intended for a trusted local database connection; use a secured operator channel for remote provisioning. Build currently downloads Geist fonts from Google. Periodically run [security cleanup](database/security-operations.sql) with a maintenance account.

## Verification

Start the app against a separate test database loaded with the schema, DML and configured environment. From `web`, using that same DB environment:

```bash
node --env-file=.env.local tests/auth.test.mjs
node --env-file=.env.local tests/integrity.test.mjs
node tests/security.test.mjs
npm run build
npm run lint
```

Tests default to `http://127.0.0.1:3000`; set `TEST_BASE_URL` to your APP_ORIGIN when different. Test accounts and inventory are generated and cleaned up; short-lived throttle records remain until cleanup. Never run integration tests on production. See [recorded results and limitations](docs/testing.md).

## Documentation

- [Project report](docs/project-report.md): problem, objectives, scope, requirements, architecture, screenshots and conclusions.
- [Database design and complete dictionary](mmo_database_design.md).
- [ER diagram](ER%20diag.svg) and its editable [Graphviz source](docs/schema.dot).
- [Important SQL queries](database/important-queries.sql).
- [Testing results](docs/testing.md).

The current implementation is MySQL-only. Course requirement 3's second database paradigm has not been implemented; see the report's scope and future work. Requirements 11–14 are addressed in separate, meaningful commits.
