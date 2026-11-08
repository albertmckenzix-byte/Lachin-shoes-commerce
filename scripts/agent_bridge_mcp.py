#!/usr/bin/env python3
"""Local MCP collaboration bridge shared by Kilo Code and Antigravity.

Uses only the Python standard library. Run from the repository root:
  python scripts/agent_bridge_mcp.py

The SQLite database is local runtime state and must never be committed.
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".agent-bridge" / "runtime"
DB_PATH = RUNTIME / "agent-bridge.sqlite3"
PROTOCOL_VERSION = "2024-11-05"
AGENTS = {"kilo", "antigravity", "human"}
STATUSES = {"open", "in_progress", "blocked", "done"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA busy_timeout=15000")
    db.executescript("""
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, sender TEXT NOT NULL,
        recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
        related_task_id TEXT, priority TEXT NOT NULL DEFAULT 'normal',
        read_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        title TEXT NOT NULL, description TEXT NOT NULL, owner TEXT NOT NULL,
        status TEXT NOT NULL, acceptance_criteria TEXT NOT NULL,
        related_files TEXT NOT NULL, claimed_by TEXT, notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS activity (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, agent TEXT NOT NULL,
        kind TEXT NOT NULL, summary TEXT NOT NULL, files TEXT NOT NULL,
        tests TEXT NOT NULL, result TEXT NOT NULL, related_task_id TEXT
      );
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, author TEXT NOT NULL,
        title TEXT NOT NULL, decision TEXT NOT NULL, rationale TEXT NOT NULL,
        affected_files TEXT NOT NULL
      );
    """)
    db.commit()
    return db


def text_arg(args: dict, key: str, required: bool = True, default: str = "") -> str:
    value = args.get(key, default)
    if not isinstance(value, str) or (required and not value.strip()):
        raise ValueError(f"'{key}' must be a non-empty string")
    return value.strip()


def list_arg(args: dict, key: str) -> list[str]:
    value = args.get(key, [])
    if not isinstance(value, list) or any(not isinstance(x, str) for x in value):
        raise ValueError(f"'{key}' must be an array of strings")
    return value


def agent_arg(args: dict, key: str = "agent") -> str:
    value = text_arg(args, key).lower()
    if value not in AGENTS:
        raise ValueError(f"'{key}' must be one of: {', '.join(sorted(AGENTS))}")
    return value


def rows(db: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    return [dict(r) for r in db.execute(sql, params).fetchall()]


def tool_definitions() -> list[dict]:
    string = {"type": "string"}
    strings = {"type": "array", "items": string}
    return [
      {"name":"get_project_context","description":"Read the canonical shared project memory and agent rules. Call at task start and whenever you need project-wide context.","inputSchema":{"type":"object","properties":{"sections":{"type":"array","items":{"type":"string","enum":["start","overview","stack","status","architecture","api","frontend","backend","decisions","issues","all"]}}},"additionalProperties":False}},
      {"name":"send_agent_message","description":"Send a durable message or handoff to the other agent. Use recipient 'broadcast' for both agents.","inputSchema":{"type":"object","properties":{"sender":string,"recipient":string,"subject":string,"message":string,"related_task_id":string,"priority":{"type":"string","enum":["low","normal","high","urgent"]}},"required":["sender","recipient","subject","message"],"additionalProperties":False}},
      {"name":"get_agent_inbox","description":"Read unread messages addressed to an agent or broadcast. Check before starting work and after completing a task.","inputSchema":{"type":"object","properties":{"agent":string,"include_read":{"type":"boolean"}},"required":["agent"],"additionalProperties":False}},
      {"name":"mark_message_read","description":"Mark a received message as read after processing it.","inputSchema":{"type":"object","properties":{"message_id":string},"required":["message_id"],"additionalProperties":False}},
      {"name":"create_shared_task","description":"Create a task for Kilo, Antigravity, or the human project owner. Include clear acceptance criteria and relevant paths.","inputSchema":{"type":"object","properties":{"creator":string,"owner":string,"title":string,"description":string,"acceptance_criteria":strings,"related_files":strings},"required":["creator","owner","title","description"],"additionalProperties":False}},
      {"name":"list_shared_tasks","description":"List shared tasks, optionally filtered by status or owner.","inputSchema":{"type":"object","properties":{"status":{"type":"string","enum":["open","in_progress","blocked","done"]},"owner":string,"limit":{"type":"integer","minimum":1,"maximum":100}},"additionalProperties":False}},
      {"name":"claim_shared_task","description":"Atomically claim an open task to avoid both agents taking the same work.","inputSchema":{"type":"object","properties":{"task_id":string,"agent":string},"required":["task_id","agent"],"additionalProperties":False}},
      {"name":"update_shared_task","description":"Update a task status and append a progress note. Use blocked when waiting on the other agent or owner.","inputSchema":{"type":"object","properties":{"task_id":string,"agent":string,"status":{"type":"string","enum":["open","in_progress","blocked","done"]},"note":string},"required":["task_id","agent","status"],"additionalProperties":False}},
      {"name":"record_agent_activity","description":"Record a completed change or milestone with exact files and checks. Never claim tests passed unless actually run.","inputSchema":{"type":"object","properties":{"agent":string,"summary":string,"files":strings,"tests":strings,"result":string,"related_task_id":string},"required":["agent","summary","result"],"additionalProperties":False}},
      {"name":"get_recent_agent_activity","description":"Read the shared activity feed to see what either agent has changed recently.","inputSchema":{"type":"object","properties":{"limit":{"type":"integer","minimum":1,"maximum":100}},"additionalProperties":False}},
      {"name":"record_architecture_decision","description":"Record an agreed durable technical decision for both agents.","inputSchema":{"type":"object","properties":{"author":string,"title":string,"decision":string,"rationale":string,"affected_files":strings},"required":["author","title","decision","rationale"],"additionalProperties":False}}
    ]


def call_tool(name: str, a: dict) -> Any:
    db = connect()
    try:
      if name == "get_project_context":
        mapping = {
          "start":"project-memory/00-START-HERE.md",
          "overview":"project-memory/01-PROJECT-OVERVIEW.md",
          "stack":"project-memory/02-TECH-STACK.md",
          "status":"project-memory/development/CURRENT-STATUS.md",
          "architecture":"project-memory/03-SYSTEM-ARCHITECTURE.md",
          "api":"project-memory/integration/API-CONTRACTS.md",
          "frontend":"project-memory/frontend/FRONTEND-ARCHITECTURE.md",
          "backend":"project-memory/backend/BACKEND-ARCHITECTURE.md",
          "decisions":"project-memory/decisions/ARCHITECTURE-DECISIONS.md",
          "issues":"project-memory/development/KNOWN-ISSUES.md",
        }
        sections = a.get("sections", ["start","overview","stack","status"])
        if not isinstance(sections, list):
            raise ValueError("'sections' must be an array")
        if "all" in sections:
            sections = list(mapping)
        output = []
        for section in sections:
          if section not in mapping:
            raise ValueError(f"Unknown context section: {section}")
          p = ROOT / mapping[section]
          output.append(f"\n## {section.upper()} — {mapping[section]}\n" + (p.read_text(encoding="utf-8") if p.exists() else "[File not found]"))
        return "\n".join(output)

      if name == "send_agent_message":
        sender = agent_arg(a, "sender")
        recipient = text_arg(a, "recipient").lower()
        if recipient not in AGENTS | {"broadcast"}:
          raise ValueError("recipient must be kilo, antigravity, human, or broadcast")
        priority = a.get("priority", "normal")
        if priority not in {"low","normal","high","urgent"}:
          raise ValueError("Invalid priority")
        mid = uuid.uuid4().hex[:12]
        db.execute("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,NULL)",
          (mid,now(),sender,recipient,text_arg(a,"subject"),text_arg(a,"message"),text_arg(a,"related_task_id",False),priority))
        db.commit()
        return {"message_id":mid,"stored":True,"recipient":recipient}

      if name == "get_agent_inbox":
        agent = agent_arg(a)
        include_read = bool(a.get("include_read", False))
        sql = "SELECT * FROM messages WHERE recipient IN (?, 'broadcast')"
        params: tuple = (agent,)
        if not include_read:
          sql += " AND read_at IS NULL"
        sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at ASC LIMIT 100"
        return rows(db,sql,params)

      if name == "mark_message_read":
        mid = text_arg(a,"message_id")
        db.execute("UPDATE messages SET read_at=? WHERE id=?",(now(),mid))
        db.commit()
        return {"message_id":mid,"marked_read":db.total_changes > 0}

      if name == "create_shared_task":
        creator = agent_arg(a,"creator")
        owner = agent_arg(a,"owner")
        tid = uuid.uuid4().hex[:10]
        db.execute("INSERT INTO tasks (id,created_at,updated_at,title,description,owner,status,acceptance_criteria,related_files) VALUES (?,?,?,?,?,?,?,?,?)",
          (tid,now(),now(),text_arg(a,"title"),text_arg(a,"description"),owner,"open",json.dumps(list_arg(a,"acceptance_criteria")),json.dumps(list_arg(a,"related_files"))))
        db.execute("INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?)",
          (uuid.uuid4().hex[:12],now(),creator,"task_created",f"Created task {tid}: {a['title']}","[]","[]","open",tid))
        db.commit()
        return {"task_id":tid,"status":"open","owner":owner}

      if name == "list_shared_tasks":
        clauses, params = [], []
        if a.get("status"):
          if a["status"] not in STATUSES: raise ValueError("Invalid status")
          clauses.append("status=?"); params.append(a["status"])
        if a.get("owner"):
          clauses.append("owner=?"); params.append(a["owner"])
        limit = max(1,min(int(a.get("limit",30)),100))
        sql = "SELECT * FROM tasks" + ((" WHERE " + " AND ".join(clauses)) if clauses else "") + " ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'open' THEN 1 WHEN 'blocked' THEN 2 ELSE 3 END, updated_at DESC LIMIT ?"
        params.append(limit)
        result = rows(db,sql,tuple(params))
        for item in result:
          item["acceptance_criteria"] = json.loads(item["acceptance_criteria"])
          item["related_files"] = json.loads(item["related_files"])
        return result

      if name == "claim_shared_task":
        tid, agent = text_arg(a,"task_id"), agent_arg(a)
        db.execute("BEGIN IMMEDIATE")
        task = db.execute("SELECT * FROM tasks WHERE id=?",(tid,)).fetchone()
        if not task:
          db.rollback(); raise ValueError("Task not found")
        if task["status"] == "done":
          db.rollback(); raise ValueError("Task is already done")
        if task["claimed_by"] and task["claimed_by"] != agent and task["status"] == "in_progress":
          db.rollback(); raise ValueError(f"Task already claimed by {task['claimed_by']}")
        db.execute("UPDATE tasks SET claimed_by=?, owner=?, status='in_progress', updated_at=? WHERE id=?",(agent,agent,now(),tid))
        db.execute("INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?)",(uuid.uuid4().hex[:12],now(),agent,"task_claimed",f"Claimed task {tid}","[]","[]","in_progress",tid))
        db.commit()
        return {"task_id":tid,"claimed_by":agent,"status":"in_progress"}

      if name == "update_shared_task":
        tid, agent, status = text_arg(a,"task_id"), agent_arg(a), text_arg(a,"status")
        if status not in STATUSES: raise ValueError("Invalid status")
        note = text_arg(a,"note",False)
        task = db.execute("SELECT * FROM tasks WHERE id=?",(tid,)).fetchone()
        if not task: raise ValueError("Task not found")
        if task["claimed_by"] and task["claimed_by"] != agent and agent != "human":
          raise ValueError(f"Task is claimed by {task['claimed_by']}; coordinate before changing it")
        combined = (task["notes"] + "\n" + f"[{now()}] {agent}: {note}").strip() if note else task["notes"]
        db.execute("UPDATE tasks SET status=?, updated_at=?, notes=? WHERE id=?",(status,now(),combined,tid))
        db.execute("INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?)",(uuid.uuid4().hex[:12],now(),agent,"task_updated",f"Task {tid} -> {status}: {note}","[]","[]",status,tid))
        db.commit()
        return {"task_id":tid,"status":status,"updated":True}

      if name == "record_agent_activity":
        agent = agent_arg(a)
        aid = uuid.uuid4().hex[:12]
        db.execute("INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?)",(aid,now(),agent,"change",text_arg(a,"summary"),json.dumps(list_arg(a,"files")),json.dumps(list_arg(a,"tests")),text_arg(a,"result"),text_arg(a,"related_task_id",False)))
        db.commit()
        return {"activity_id":aid,"recorded":True}

      if name == "get_recent_agent_activity":
        limit = max(1,min(int(a.get("limit",20)),100))
        return rows(db,"SELECT * FROM activity ORDER BY created_at DESC LIMIT ?",(limit,))

      if name == "record_architecture_decision":
        author = agent_arg(a,"author")
        did = uuid.uuid4().hex[:12]
        db.execute("INSERT INTO decisions VALUES (?,?,?,?,?,?,?)",(did,now(),author,text_arg(a,"title"),text_arg(a,"decision"),text_arg(a,"rationale"),json.dumps(list_arg(a,"affected_files"))))
        db.execute("INSERT INTO activity VALUES (?,?,?,?,?,?,?,?,?)",(uuid.uuid4().hex[:12],now(),author,"decision",f"Decision: {a['title']}","[]","[]","recorded",None))
        db.commit()
        return {"decision_id":did,"recorded":True}
      raise ValueError(f"Unknown tool: {name}")
    finally:
      db.close()


def send(message: dict) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False, separators=(",",":")) + "\n")
    sys.stdout.flush()


def handle(message: dict) -> None:
    method = message.get("method")
    request_id = message.get("id")
    if method == "notifications/initialized" or method == "notifications/cancelled":
        return
    if method == "initialize":
        params = message.get("params", {})
        send({"jsonrpc":"2.0","id":request_id,"result":{
          "protocolVersion":params.get("protocolVersion",PROTOCOL_VERSION),
          "capabilities":{"tools":{"listChanged":False}},
          "serverInfo":{"name":"lachin-agent-bridge","version":"1.0.0"}
        }})
        return
    if method == "ping":
        send({"jsonrpc":"2.0","id":request_id,"result":{}})
        return
    if method == "tools/list":
        send({"jsonrpc":"2.0","id":request_id,"result":{"tools":tool_definitions()}})
        return
    if method == "tools/call":
        params = message.get("params", {})
        name = params.get("name")
        args = params.get("arguments") or {}
        try:
          result = call_tool(name, args)
          send({"jsonrpc":"2.0","id":request_id,"result":{"content":[{"type":"text","text":json.dumps(result,ensure_ascii=False,indent=2)}]}})
        except Exception as exc:
          send({"jsonrpc":"2.0","id":request_id,"result":{"isError":True,"content":[{"type":"text","text":str(exc)}]}})
        return
    if request_id is not None:
        send({"jsonrpc":"2.0","id":request_id,"error":{"code":-32601,"message":f"Method not found: {method}"}})


def main() -> None:
    # stdout is reserved exclusively for MCP JSON-RPC messages.
    for line in sys.stdin:
      line = line.strip()
      if not line:
        continue
      try:
        handle(json.loads(line))
      except Exception as exc:
        print(f"agent-bridge error: {exc}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
