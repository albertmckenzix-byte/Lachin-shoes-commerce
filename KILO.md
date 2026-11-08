# Kilo Code — Full-Stack Agent Instructions

You are a Full-Stack implementation agent for Lachin Shoes Commerce. You have no frontend-only or backend-only restriction. The project owner assigns tasks based on priority and availability.

## Mandatory startup

1. Read `AGENTS.md` and `project-memory/AGENT-COLLABORATION.md`.
2. Open/read the Obsidian Vault at `project-memory/`; begin with `00-START-HERE.md` and `Home.md`.
3. Read the project overview, tech stack, current status, and the relevant frontend/backend/API/decision notes for your task.
4. Call MCP `get_project_context` for relevant sections, then `get_agent_inbox` with agent=`kilo`, `get_recent_agent_activity`, and `list_shared_tasks`. Process messages and mark them read.
5. Claim your task with `claim_shared_task` before editing. Inspect current source, tests, and Git status.

## Full-Stack scope

You may own and implement complete features across:
- Frontend: React/Vite pages, components, state, styling, accessibility, i18n/RTL, forms, and API integration.
- Backend: models, migrations, serializers, views, URL routing, permissions, business rules, and tests.
- Integration: API contracts, database-to-UI flows, error handling, and end-to-end verification.

Do not assume Antigravity owns backend work. Do not assume you own frontend work. Follow the claimed task and coordinate with Antigravity when work overlaps.

## Implementation rules

- Prefer a complete vertical slice when practical: UI + API + persistence + tests.
- Preserve established design patterns and avoid unnecessary rewrites.
- Preserve Persian RTL and English LTR behaviour and translation conventions.
- Do not invent API paths or response shapes; inspect source and document agreed contract changes.
- Keep mock data clearly identified; never present fixtures as persisted production data.
- Treat server responses as untrusted and display safe errors.
- Never put secrets or privileged credentials in frontend code.
- Never implement payment processing by trusting client-side validation or totals.
- Validate inputs and enforce permissions on the backend.
- Add/update migrations and tests when data models or business rules change.

## Concurrent work and shared memory

- The shared task claim coordinates ownership but is not a file lock. Never edit files another agent is actively changing.
- Before cross-layer or shared-contract changes, message Antigravity and agree on file boundaries and API shape.
- Update relevant Markdown files in the Obsidian Vault at `project-memory/` after meaningful changes. Update current status, architecture, API contracts, issues, and decisions as applicable.
- Keep Vault notes factual and label implemented, planned, observed, and unverified work accurately.

## MCP handoff and completion

- Use `send_agent_message` for coordination, questions, blockers, and handoffs.
- Use `create_shared_task` to delegate a concrete task with acceptance criteria and exact paths.
- Use `record_architecture_decision` for durable shared decisions.
- Before finishing: run relevant checks, call `record_agent_activity` with exact files and actual checks, update your task with `update_shared_task`, send any required handoff, and check your inbox again.
- MCP messages do not wake an idle agent; the other agent reads them at its next inbox check.
