# Shared AI Project Memory

> **Purpose:** The canonical, human-readable project brain and Obsidian Vault for every developer and AI coding agent working on Lachin Shoes Commerce.
>
> **Repository:** [Lachin-shoes-commerce](https://github.com/albertmckenzix-byte/Lachin-shoes-commerce)
> **Vault root:** `project-memory/`
> **Memory branch:** `feature/shared-ai-memory`

## Start here

1. Open `project-memory/` as an Obsidian Vault and start with [Home](Home.md).
2. Read the root `AGENTS.md` and [Agent Collaboration Protocol](AGENT-COLLABORATION.md).
3. Read [Project Overview](01-PROJECT-OVERVIEW.md), [Tech Stack](02-TECH-STACK.md), and [Current Status](development/CURRENT-STATUS.md).
4. Before changing a feature, read its relevant frontend/backend notes and [API contracts](integration/API-CONTRACTS.md).
5. Connect to the local `lachin-agent-bridge` MCP server; check your inbox, recent activity, and shared task list.
6. Claim a task before editing. Inspect the current code and Git status.
7. After meaningful work, update the relevant Vault notes and record the work in the MCP activity feed.

## Memory map

- [Vault dashboard](Home.md)
- [Agent collaboration](AGENT-COLLABORATION.md)
- [Local MCP bridge tools](agent-bridge/README.md)
- [Project overview](01-PROJECT-OVERVIEW.md)
- [Technology stack](02-TECH-STACK.md)
- [System architecture](03-SYSTEM-ARCHITECTURE.md)
- [Frontend architecture](frontend/FRONTEND-ARCHITECTURE.md)
- [Backend architecture](backend/BACKEND-ARCHITECTURE.md)
- [Database notes](backend/DATABASE-SCHEMA.md)
- [API contracts](integration/API-CONTRACTS.md)
- [Current status](development/CURRENT-STATUS.md)
- [Known issues and verification gaps](development/KNOWN-ISSUES.md)
- [Decision log](decisions/ARCHITECTURE-DECISIONS.md)
- [Kilo Code instructions](../KILO.md)
- [Antigravity instructions](../ANTIGRAVITY.md)

## Source-of-truth order

When information conflicts, use this order:

1. Current executable source code and tests.
2. Current migrations and API implementation.
3. Explicit, recent decisions recorded in this Vault.
4. Older notes, TODOs, and assumptions.

If a note is stale, correct it rather than silently following it. Record unresolved conflicts in `development/KNOWN-ISSUES.md`.

## Evidence labels

Use these labels when documenting claims:

- **Verified:** directly checked in current source, migration, test, or runtime output.
- **Observed:** seen in the repository, but its runtime behaviour has not been tested.
- **Planned:** an agreed future change, not implemented yet.
- **Unverified:** requires inspection or testing.

Never describe a planned or mocked feature as complete.
