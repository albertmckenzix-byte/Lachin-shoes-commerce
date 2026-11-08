# Agent Collaboration Protocol

## Purpose and roles

Kilo Code and Google Antigravity are **equal Full-Stack agents**. Either may implement frontend, backend, database, API, tests, or an end-to-end feature. The project owner assigns tasks; there are no permanent frontend/backend ownership silos.

The agents share:
- The Obsidian Vault at `project-memory/` for canonical human-readable project memory.
- A workspace-level MCP bridge for messages, tasks, activity, and decisions.
- One Git repository for version history and synchronization.

## Obsidian Vault setup

The repository folder `project-memory/` is the Vault root. Open that exact folder in Obsidian using **Open folder as vault**. Do not create a second copy of the memory elsewhere.

- Start at `Home.md` for the dashboard.
- Use `00-START-HERE.md` for the onboarding sequence.
- Existing Markdown notes and folders are already part of the Vault.
- Obsidian settings are stored in `project-memory/.obsidian/`; the tracked app settings enable wiki-style links.
- Keep notes in Markdown so both coding agents can read/write them without needing Obsidian running.
- Git tracks the Vault. Commit and push memory updates with the related code changes. Obsidian itself does not sync separate machines; use Git pull/push or an explicitly configured sync service.

## Required workspace setup

**Open the same local repository checkout in both IDEs** if you want the local SQLite task/message bus to be shared. The bridge database is stored at `.agent-bridge/runtime/agent-bridge.sqlite3`. Separate clones or separate computers do not share that local database; a centrally hosted remote MCP server is required for a shared live message bus across machines.

The MCP configurations are:
- Kilo: `.kilo/kilo.json`
- Antigravity: `.agents/mcp_config.json`

Both launch `python scripts/agent_bridge_mcp.py`. If Windows does not resolve `python`, use the full path to Python or the appropriate `py` command in the local MCP configuration.

## Startup protocol — both agents

1. Read root `AGENTS.md`, then `project-memory/Home.md` and `00-START-HERE.md`.
2. Read the project overview, stack, current status, and task-relevant frontend/backend/API/decision notes.
3. Call MCP `get_project_context` for the relevant sections.
4. Call `get_agent_inbox` with your identity (`kilo` or `antigravity`); process messages and mark them read.
5. Call `get_recent_agent_activity` and `list_shared_tasks`.
6. Claim the task with `claim_shared_task` before editing.
7. Inspect actual source, tests, Git branch, and working-tree status.

## Task ownership and concurrency

- Both agents may take any Full-Stack task. Task assignment is based on the shared task owner/claim, not an agent's name or a frontend/backend label.
- Create tasks with a clear outcome, acceptance criteria, dependencies, and exact expected file paths.
- A single agent should own a feature end-to-end when practical.
- If splitting a feature, define non-overlapping file boundaries and an explicit API/data contract before either agent edits.
- A task claim is cooperative coordination, **not a filesystem lock**. It does not technically prevent an agent from editing a file. Agents must check the task list/activity feed and message each other before touching overlapping files.
- Do not switch branches, reset, stash, or perform destructive Git operations in a shared working tree without coordinating with the other agent.

## During work

- Use `send_agent_message` for handoffs, questions, blockers, and API coordination. Use `broadcast` for announcements both agents need.
- Use `create_shared_task` to delegate work. Include acceptance criteria and exact file paths.
- Use `record_architecture_decision` for durable decisions affecting the project.
- Use `record_agent_activity` after meaningful changes, listing exact files and checks actually run.
- Update canonical Markdown notes in the Vault as part of meaningful code changes.
- Before changing shared API contracts, database models, or migrations that another active task depends on, message the other agent and agree the change.

## Completion and handoff

1. Run relevant tests/builds and report only observed results.
2. Update task status with `update_shared_task`.
3. Record activity with exact changed paths and checks.
4. Send the other agent a handoff with contracts, assumptions, tests, and remaining work.
5. Check the inbox and recent activity before finishing.

## Synchronization semantics and limitations

- When both IDEs open the same local folder, code and Vault Markdown changes are visible through the shared filesystem.
- MCP messages/tasks/activity are stored transactionally in SQLite and are available on the recipient's next MCP call.
- MCP does not forcibly interrupt or wake an idle model. Agents must check inboxes at startup, after milestones, and before finishing. This is cooperative near-real-time coordination, not autonomous background execution.
- Obsidian is the Vault editor/knowledge interface, not the messaging transport.
- Git is the durable version history and sync mechanism between separate clones/machines. Pull/rebase before starting work and push shared changes.

## Security and reliability

- Do not store secrets, tokens, credentials, customer personal data, or payment data in messages, tasks, or the Vault.
- Do not automatically merge or overwrite another agent's work. Use branches/PRs and human review for risky cross-cutting changes.
- The SQLite database is runtime-only and ignored by Git. It is not a backup; durable decisions and project facts must also be recorded in the Vault.
- Keep source code and tests authoritative. Label notes as verified, observed, planned, or unverified.
