# Architecture Decision Log

Record decisions that materially affect architecture, API contracts, data models, security, or development workflow.

## ADR-001 — Shared repository memory

- **Status:** Accepted
- **Decision:** Store shared AI context as Markdown files in the same Git repository under `project-memory/`.
- **Reason:** Kilo Code, Antigravity, and human contributors can read the same versioned context; Obsidian can open the repository/folder as a vault.
- **Consequences:** Memory changes are version-controlled and reviewable. Agents must read relevant files before work and update them after meaningful changes.

## ADR-002 — Separate agent responsibilities, shared contracts

- **Status:** Accepted
- **Decision:** Kilo Code primarily owns frontend implementation; Antigravity primarily owns backend implementation. Both must coordinate through shared API contracts and may inspect or modify adjacent layers when integration requires it.
- **Reason:** Preserve focused ownership without allowing frontend/backend contract drift.
- **Consequences:** Any cross-layer change must document affected callers, endpoints, schemas, and verification.

## ADR-003 — Source code outranks stale memory

- **Status:** Accepted
- **Decision:** Current source code, migrations, tests, and runtime behaviour outrank documentation when they conflict.
- **Reason:** Prevent stale notes from becoming false instructions.
- **Consequences:** Agents should correct memory when they discover drift and record unresolved ambiguity.
