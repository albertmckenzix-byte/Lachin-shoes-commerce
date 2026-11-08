# Shared Agent Instructions — Lachin Shoes Commerce

These instructions apply to every AI coding agent and human contributor working in this repository.

## 1. Read shared context first

At the start of each task:
1. Read this file and `project-memory/00-START-HERE.md`.
2. Read the project overview, tech stack, and current status.
3. Read the relevant frontend/backend/API/decision notes for the task.
4. Read `project-memory/AGENT-COLLABORATION.md`.
5. Call the shared MCP context and inbox tools as described in the collaboration protocol.
6. Inspect the actual source code, tests, and current Git status before editing.

Agent-specific quick-start instructions:
- Kilo Code: `KILO.md`
- Google Antigravity: `ANTIGRAVITY.md`

## 2. Shared source of truth

The code, migrations, tests, and verified runtime behaviour are authoritative. The Obsidian Vault at `project-memory/` is the canonical human-readable project memory. If code and memory disagree, investigate and update the memory; do not blindly follow stale notes.

Clearly distinguish implemented, mocked, planned, and unverified behaviour.

## 3. Full-Stack agent model

Kilo Code and Google Antigravity are both **Full-Stack agents**. Neither agent has an exclusive frontend or backend role. Either may implement, debug, test, or review:
- Frontend pages, components, state, styling, accessibility, i18n/RTL, and API integration.
- Backend models, migrations, serializers, views, routing, permissions, business rules, and tests.
- Cross-layer features spanning frontend, backend, database, and API contracts.

The project owner may assign any task to either agent. Task ownership is determined by the shared task claim, not by a permanent frontend/backend split.

## 4. Collaboration protocol

- Use the local `lachin-agent-bridge` MCP server for durable messages, shared tasks, activity, and decisions. See `project-memory/AGENT-COLLABORATION.md`.
- At startup, check your inbox, recent activity, and shared task list.
- Claim a shared task before editing. A task should name its owner, exact expected paths, acceptance criteria, and dependencies.
- One agent owns a task's implementation at a time. Do not have both agents edit the same files concurrently.
- For cross-layer tasks, prefer one agent owning the complete vertical slice. If work must be split, define non-overlapping file ownership and explicit API handoffs first.
- API contracts and database changes are shared concerns. Communicate before changing a contract that another in-progress task depends on.
- Before integration work, inspect both the frontend caller and backend implementation.
- MCP coordination is cooperative: it does not interrupt or wake an idle model. Agents must check their inbox at startup, after milestones, and before finishing.

## 5. Obsidian Vault / memory maintenance

Open `project-memory/` as the Obsidian Vault. The same Markdown files remain readable in any editor and version-controlled by Git.

After every meaningful task, update the relevant files under `project-memory/` in the same branch/change where practical.

At minimum, update `development/CURRENT-STATUS.md` when implementation status changes. Also update:
- API contracts when endpoints or payloads change.
- Architecture/database notes when structure or models change.
- Known issues when risks are found or resolved.
- Decision log when a lasting technical decision is made.

A memory update must state:
- What changed and why.
- Relevant source paths.
- Whether the work is implemented, tested, or still unverified.
- Commands/tests actually run and their outcomes.
- Remaining work/blockers.

Do not fabricate test results, endpoint behaviour, schema details, or deployment facts. Do not store secrets, tokens, credentials, customer personal data, or payment data in the Vault.

## 6. Git workflow and concurrent editing

- Work on the task branch requested by the project owner.
- Do not commit directly to the default branch unless explicitly requested.
- Check `git status` and branch before editing.
- In the shared local checkout, coordinate before switching branches or performing operations that affect the other agent's working tree.
- Avoid simultaneous edits to the same memory or source file. Shared task claims are coordination, not operating-system file locks.
- Pull/rebase carefully before pushing; resolve conflicts by preserving verified information.
- Keep commits focused and descriptive.
- Never overwrite another agent's unreviewed work.

## 7. Security and data handling

- Never commit secrets, tokens, passwords, private keys, or real customer/payment data.
- Never trust client-side prices, totals, coupons, stock, or payment status.
- Enforce backend permissions and validation.
- Do not log credentials, tokens, payment details, or unnecessary personal data.
- The local bridge database is runtime-only and must stay ignored by Git.

## 8. Completion reporting

At the end of a task, report:
1. Files changed.
2. Behaviour implemented.
3. API/contract impact.
4. Tests/checks run and exact outcomes.
5. Vault memory files updated.
6. Remaining issues or follow-up tasks.
