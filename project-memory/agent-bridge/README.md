# Local Agent Bridge

This folder documents the local MCP collaboration bridge. Runtime state is intentionally stored outside this tracked folder at `.agent-bridge/runtime/` and is ignored by Git.

## MCP tools

- Context: `get_project_context`
- Messaging: `send_agent_message`, `get_agent_inbox`, `mark_message_read`
- Task coordination: `create_shared_task`, `list_shared_tasks`, `claim_shared_task`, `update_shared_task`
- Activity: `record_agent_activity`, `get_recent_agent_activity`
- Decisions: `record_architecture_decision`

## Manual smoke test

From repository root:

```bash
python scripts/agent_bridge_mcp.py
```

The process speaks MCP JSON-RPC over stdin/stdout. Do not type arbitrary text into the process; connect through an MCP client. For a quick protocol test, send an initialize request followed by tools/list. Diagnostics are written to stderr only.

The bridge requires Python 3.10+ and uses only the standard library.
