# Arena Ops web application

See the repository [setup guide](../README.md) for database initialization, environment variables, account bootstrap, execution and verification. The [project report](../docs/project-report.md) documents the implemented functionality and screenshots.

This folder uses Next.js App Router, React, mysql2 and bcryptjs. Route handlers enforce authentication and authorization before running database operations. New helpers and local variables use PascalCase where practical; framework exports (`GET`, `POST`, `metadata`, `headers`) and existing SQL/API field names retain their required conventions.
