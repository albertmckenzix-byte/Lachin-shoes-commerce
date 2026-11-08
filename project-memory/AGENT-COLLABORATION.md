# Agent Collaboration Protocol

## Purpose

Kilo Code (frontend lead) and Google Antigravity (backend lead) share one workspace-level MCP bridge. The bridge stores messages, tasks, activity, and decisions in a local SQLite database at `.agent-bridge/runtime/agent-bridge.sqlite3`. It uses Python's standard library; no project dependency installation is required.

## Required workspace setup

**Open the same local checkout/folder in both IDEs.** The local SQLite bus is shared only when both MCP servers resolve to the same repository directory. Separate clones or separate computers do not share this local database. For those setups, a centrally hosted remote MCP server would be required.

The Kilo and Antigravity MCP config files are committed in:
- `.kilo/kilo.json`
- `.agents/mcp_config.json`

Both launch `python scripts/agent_bridge_mcp.py`. If Windows does not resolve `python`, change the command to the full path to the Python executable (or `py` with the script path as an argument) in the respective local config.

## Startup protocol — both agents

1. Read `AGENTS.md` and the relevant `project-memory` files.
2. Call MCP tool `get_project_context` for the relevant sections.
3. Call `get_agent_inbox` using your identity (`kilo` or `antigravity`) and process unread messages. Mark each processed message with `mark_message_read`.
4. Call `list_shared_tasks`; claim a task with `claim_shared_task` before starting it.
5. Inspect the actual source and current Git status before editing.

## During work

- Use `send_agent_message` for cross-agent handoffs, questions, blockers, and API coordination. Use `broadcast` for announcements both agents need.
- Use `create_shared_task` to delegate work. Include acceptance criteria and exact file paths.
- Use `record_architecture_decision` for durable decisions affecting both sides.
- Use `record_agent_activity` after meaningful changes, listing exact files and checks actually run.
- Update relevant Markdown memory files as part of the code change; MCP records are an operational feed, not a replacement for canonical architecture/API documentation.
- Before changing shared API contracts, message the other agent and agree the request/response shape.

## Completion and handoff

1. Run the relevant tests/builds and report only observed results.
2. Update task status with `update_shared_task`.
3. Record changes with `record_agent_activity`.
4. Send a handoff message to the other agent with paths, contracts, assumptions, tests, and remaining work.
5. Check the inbox and recent activity before finishing.

## Live synchronization semantics

- Shared files are visible immediately to both IDEs when they open the same local folder; normal editor file watching handles disk changes.
- Messages/tasks/activity are written transactionally to SQLite and are available to the other MCP client on its next tool call.
- MCP does not forcibly interrupt or wake an idle model conversation. Agents must check their inbox at startup, after milestones, and before finishing. This is cooperative near-real-time coordination, not autonomous background execution.
- Git remains the durable version history and the sync mechanism between separate machines/clones. Commit/push shared code and memory changes; pull/rebase before starting work.

## Conflict and safety rules

- Claim tasks before editing. Do not claim a task already in progress for the other agent.
- Prefer separate ownership boundaries: Kilo owns `src/**`; Antigravity owns `backend/**`; API contracts and root project memory require explicit coordination.
- Do not store secrets, tokens, credentials, customer personal data, or payment data in messages, tasks, or memory.
- Do not automatically merge or overwrite another agent's work. Use branches/PRs and human review for cross-cutting changes.
- The SQLite database is runtime-only and ignored by Git. It is not a backup; important decisions and project facts must also be recorded in tracked Markdown files.
