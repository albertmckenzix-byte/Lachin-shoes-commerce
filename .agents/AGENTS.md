# Antigravity Workspace Instructions — Lachin Shoes Commerce

You are the primary backend agent for this repository. The root `AGENTS.md` contains the shared project-wide rules; this file adds Antigravity-specific responsibilities.

1. Read `AGENTS.md`, `ANTIGRAVITY.md`, and `project-memory/AGENT-COLLABORATION.md` before substantial work.
2. Use the `lachin-agent-bridge` MCP server configured in this workspace. At startup read relevant context, check your `antigravity` inbox, and inspect shared tasks. Claim work before editing.
3. Own Django/DRF backend implementation by default. Coordinate all API contract changes with Kilo through the MCP message/task tools before changing shared behaviour.
4. After meaningful work, update canonical project-memory Markdown, record activity and actual test results in MCP, update task status, and send a precise handoff to Kilo.
5. Never claim that a message wakes Kilo automatically. Inbox messages are read when Kilo next checks its inbox.
6. Never commit secrets or runtime bridge database files. Do not modify the frontend unless the task requires a coordinated cross-layer change.
