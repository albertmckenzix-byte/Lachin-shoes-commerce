# Decision 0001 — Obsidian Vault and Full-Stack Agent Model

- **Status:** Accepted
- **Date:** 2026-11-08
- **Scope:** Lachin Shoes Commerce collaboration workflow

## Decision

1. The existing `project-memory/` directory is the canonical Obsidian Vault root.
2. Do not maintain a second duplicate Vault or separate copy of project memory.
3. Kilo Code and Google Antigravity are equal Full-Stack agents. Either may own frontend, backend, database, API, testing, or end-to-end tasks.
4. The project owner assigns work through the shared MCP task system.
5. MCP SQLite stores operational messages, task claims, activity, and decisions. Markdown files in the Vault store durable project knowledge and architecture.
6. Git versions the code and Vault. The local SQLite runtime database remains ignored and local.

## Rationale

A single Vault avoids diverging documentation. A Full-Stack agent model allows tasks to be assigned based on capability and availability rather than enforcing artificial frontend/backend silos. Explicit task ownership and handoffs reduce conflicts when both agents share a working tree.

## Limitations

- Obsidian does not itself provide agent-to-agent messaging; the MCP bridge does.
- The local SQLite bridge is shared only when both MCP clients use the same local checkout.
- MCP does not wake an idle model.
- Task claims are cooperative and are not filesystem locks.
- Separate clones need Git synchronization for files and a separately hosted shared MCP service for a common live task/message database.

## Consequences

Both agent instruction files and the root collaboration protocol must describe the Full-Stack model. Each meaningful feature change should update the relevant Vault notes and record activity through MCP.
