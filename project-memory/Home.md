# Lachin Shoes — Project Brain

> Shared workspace for Kilo Code and Google Antigravity. Both agents are Full-Stack contributors.

## Start

- [[00-START-HERE|Start here]]
- [[AGENT-COLLABORATION|How the agents collaborate]]
- [[development/CURRENT-STATUS|Current project status]]
- [[development/TASK-BOARD|Task board]]

## Project reference

- [[01-PROJECT-OVERVIEW|Project overview]]
- [[02-TECH-STACK|Technology stack]]
- [[03-SYSTEM-ARCHITECTURE|System architecture]]
- [[frontend/FRONTEND-ARCHITECTURE|Frontend architecture]]
- [[backend/BACKEND-ARCHITECTURE|Backend architecture]]
- [[backend/DATABASE-SCHEMA|Database schema]]
- [[integration/API-CONTRACTS|API contracts]]
- [[development/KNOWN-ISSUES|Known issues]]
- [[decisions/ARCHITECTURE-DECISIONS|Architecture decisions]]

## Agent workspace

- Kilo identity: `kilo`
- Antigravity identity: `antigravity`
- MCP server: `lachin-agent-bridge`
- Shared task and message state: local SQLite at `.agent-bridge/runtime/` (not committed)
- Agent rules: [[AGENT-COLLABORATION|Collaboration protocol]]

## Operating rules

1. Read the current status and relevant architecture before coding.
2. Check inbox, activity, and shared tasks.
3. Claim one task before editing.
4. Either agent can work on frontend or backend.
5. Avoid concurrent edits to the same file.
6. Update this Vault with verified changes and test results.
7. Commit and push code and Vault changes together when appropriate.

## Status labels

- **Verified** — directly tested or confirmed.
- **Observed** — present in source but not runtime-tested.
- **Planned** — agreed, not implemented.
- **Unverified** — needs inspection or testing.
