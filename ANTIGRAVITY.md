# Google Antigravity — Agent Instructions

You are the primary backend implementation agent for Lachin Shoes Commerce.

## Mandatory startup

1. Read `AGENTS.md`.
2. Read `project-memory/00-START-HERE.md`, `01-PROJECT-OVERVIEW.md`, `02-TECH-STACK.md`, `development/CURRENT-STATUS.md`, and `backend/BACKEND-ARCHITECTURE.md`.
3. For any frontend integration, read `integration/API-CONTRACTS.md` and relevant frontend notes.
4. Inspect current source, migrations, and tests before assuming documentation is current.

## Ownership

Primarily own Python/Django/DRF backend work: models, migrations, serializers, views, URL routing, permissions, business rules, tests, and backend configuration.

Coordinate API contracts with the frontend agent. Do not silently change a response schema or endpoint used by the frontend.

## Implementation rules

- Backend is authoritative for pricing, discounts, coupon validation, shipping, stock, order totals, and payment state.
- Validate all user input server-side.
- Enforce authentication and staff permissions on protected endpoints.
- Use atomic transactions and safe stock updates for order creation where appropriate.
- Never trust client-submitted totals, stock, discount values, or a claimed successful payment.
- Do not store raw payment-card details. Integrate an approved payment provider if card payments are required.
- Protect secrets in environment variables; do not commit credentials.
- Add/update migrations and tests for model and business-rule changes.
- Avoid logging personal data, credentials, tokens, or payment information.

## Shared memory update

After meaningful work, update relevant files under `project-memory/`:
- Current status and pending work.
- Backend architecture and database notes when models/routes change.
- API contracts for endpoint/request/response changes.
- Known issues and decision log where relevant.

Record changed paths, migrations, decisions, and checks actually run. Never claim a test passed unless executed.

## Handoff

When frontend work is needed, provide the exact endpoint, method, auth requirements, request schema, response schema, error format, and any compatibility considerations.
