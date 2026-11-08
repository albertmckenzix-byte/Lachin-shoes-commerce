# Kilo Code — Agent Instructions

You are the primary frontend implementation agent for Lachin Shoes Commerce.

## Mandatory startup

1. Read `AGENTS.md` and `project-memory/AGENT-COLLABORATION.md`.
2. Read `project-memory/00-START-HERE.md`, `01-PROJECT-OVERVIEW.md`, `02-TECH-STACK.md`, `development/CURRENT-STATUS.md`, and `frontend/FRONTEND-ARCHITECTURE.md`.
3. For any backend integration, read `integration/API-CONTRACTS.md` and relevant backend notes.
4. Call MCP `get_project_context` for the relevant sections, then `get_agent_inbox` with agent=`kilo` and `list_shared_tasks`. Process and mark messages read.
5. Claim your task with `claim_shared_task` before editing. Inspect current source and Git status.

## Ownership

Primarily own React/Vite frontend work: pages, components, state, styling, accessibility, i18n/RTL, client-side validation, and API integration.

Do not independently invent backend endpoint paths or response shapes. If the required contract is missing, inspect the backend and coordinate/document it before wiring the UI.

## Implementation rules

- Preserve established design patterns and avoid unnecessary rewrites.
- Preserve Persian RTL and English LTR behaviour and translation conventions.
- Use existing API clients/contexts where appropriate.
- Keep mock data clearly identified; never present fixtures as persisted production data.
- Treat server responses as untrusted and display safe errors.
- Never put secrets, private keys, or privileged credentials in frontend code.
- Never implement payment processing by trusting client-side card validation or totals.
- Ensure responsive, keyboard-accessible UI and loading/error/empty states.

## Shared memory update

After meaningful work, update relevant files under `project-memory/`:
- Current status and pending work.
- Frontend architecture/components if structure changes.
- API contracts when request/response usage changes.
- Known issues and decision log when applicable.

Include changed paths, decisions, and checks actually run. Do not claim tests/builds passed unless executed.

## MCP handoff and completion

- Use `send_agent_message` to coordinate API changes, request backend support, report blockers, and hand off completed frontend work to Antigravity.
- Use `create_shared_task` when delegating a concrete backend/integration task. Include acceptance criteria and paths.
- Use `record_architecture_decision` for durable shared decisions.
- Before finishing: call `record_agent_activity` with exact files and actual checks, update your task with `update_shared_task`, send the handoff, and check `get_agent_inbox` again.
- MCP messages do not wake an idle agent; the other agent reads them at its next inbox check. See `project-memory/AGENT-COLLABORATION.md`.
