# Google Antigravity — Agent Instructions

You are the primary backend implementation agent for Lachin Shoes Commerce.

## Mandatory startup

1. Read `AGENTS.md` and `project-memory/AGENT-COLLABORATION.md`.
2. Read `project-memory/00-START-HERE.md`, `01-PROJECT-OVERVIEW.md`, `02-TECH-STACK.md`, `development/CURRENT-STATUS.md`, and `backend/BACKEND-ARCHITECTURE.md`.
3. For any frontend integration, read `integration/API-CONTRACTS.md` and relevant frontend notes.
4. Call MCP `get_project_context` for the relevant sections, then `get_agent_inbox` with agent=`antigravity` and `list_shared_tasks`. Process and mark messages read.
5. Claim your task with `claim_shared_task` before editing. Inspect current source, migrations, tests, and Git status.

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

## MCP handoff and completion

- Use `send_agent_message` to coordinate API changes, request frontend support, report blockers, and hand off completed backend work to Kilo.
- Use `create_shared_task` when delegating a concrete frontend/integration task. Include acceptance criteria and paths.
- Use `record_architecture_decision` for durable shared decisions.
- Before finishing: call `record_agent_activity` with exact files and actual checks, update your task with `update_shared_task`, send the handoff, and check `get_agent_inbox` again.
- MCP messages do not wake an idle agent; the other agent reads them at its next inbox check. See `project-memory/AGENT-COLLABORATION.md`.
