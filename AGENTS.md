# Shared Agent Instructions — Lachin Shoes Commerce

These instructions apply to every AI coding agent and human contributor working in this repository.

## 1. Read shared context first

At the start of each task:
1. Read this file and `project-memory/00-START-HERE.md`.
2. Read the project overview, tech stack, and current status.
3. Read the relevant frontend/backend/API/decision notes for the task.
4. Read `project-memory/AGENT-COLLABORATION.md`.
5. Inspect the current source code and tests before editing.

Agent-specific instructions:
- Kilo Code: `KILO.md`
- Google Antigravity: `ANTIGRAVITY.md`

## 2. Shared source of truth

The code, migrations, tests, and verified runtime behaviour are authoritative. Markdown memory is shared context and must be kept accurate. If code and memory disagree, investigate and update the memory; do not blindly follow stale notes.

Clearly distinguish implemented, mocked, planned, and unverified behaviour.

## 3. Collaboration protocol

- Kilo Code primarily owns frontend work.
- Antigravity primarily owns backend work.
- Both agents may inspect either side and make cross-layer changes when necessary.
- API contracts are shared ownership. Never silently change an endpoint or schema.
- Before integration work, inspect both the frontend caller and backend implementation.
- Use explicit handoffs containing file paths, endpoint details, schemas, assumptions, and acceptance criteria.
- Use the local `lachin-agent-bridge` MCP server for durable messages, shared tasks, activity, and decisions. See `project-memory/AGENT-COLLABORATION.md`.
- At startup, check your inbox and shared task list. Before finishing, record activity, update task status, send any required handoff, and check the inbox again.
- Claim a shared task before starting it. Never take over a task already claimed by the other agent without coordination.

## 4. Memory maintenance

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

Do not fabricate test results, endpoint behaviour, schema details, or deployment facts.

## 5. Git workflow and concurrent editing

- Work on the task branch requested by the project owner.
- Do not commit directly to the default branch unless explicitly requested.
- Check `git status` and branch before editing.
- Avoid simultaneous edits to the same memory file. If agents work in parallel, use separate task branches or coordinate ownership.
- Pull/rebase carefully before pushing; resolve conflicts by preserving verified information.
- Keep commits focused and descriptive.
- Never overwrite another agent's unreviewed work.

## 6. Security and data handling

- Never commit secrets, tokens, passwords, private keys, or real customer/payment data.
- Never trust client-side prices, totals, coupons, stock, or payment status.
- Enforce backend permissions and validation.
- Do not log credentials, tokens, payment details, or unnecessary personal data.
- The local bridge database is runtime-only and must stay ignored by Git.

## 7. Completion reporting

At the end of a task, report:
1. Files changed.
2. Behaviour implemented.
3. API/contract impact.
4. Tests/checks run and exact outcomes.
5. Memory files updated.
6. Remaining issues or follow-up tasks.
