# Shared AI Project Memory

> **Purpose:** The canonical, human-readable context for every developer and AI coding agent working on Lachin Shoes Commerce.
>
> **Repository:** [Lachin-shoes-commerce](https://github.com/albertmckenzix-byte/Lachin-shoes-commerce)
> **Memory branch:** `feature/shared-ai-memory`

## Start here

1. Read the root `AGENTS.md`.
2. Read [Project Overview](01-PROJECT-OVERVIEW.md), [Tech Stack](02-TECH-STACK.md), and [Current Status](development/CURRENT-STATUS.md).
3. Before changing a feature, read its relevant frontend/backend notes and the [API contracts](integration/API-CONTRACTS.md).
4. Inspect the current code. These notes are context, not a substitute for source code.
5. After meaningful work, update the relevant memory files in the same change/commit where practical.

## Memory map

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
3. Explicit, recent decisions recorded in this memory.
4. Older notes, TODOs, and assumptions.

If a note is stale, correct it rather than silently following it. Record unresolved conflicts in `development/KNOWN-ISSUES.md`.

## Evidence labels

Use these labels when documenting claims:

- **Verified:** directly checked in current source, migration, test, or runtime output.
- **Observed:** seen in the repository, but its runtime behaviour has not been tested.
- **Planned:** an agreed future change, not implemented yet.
- **Unverified:** requires inspection or testing.

Never describe a planned or mocked feature as complete.
