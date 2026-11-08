"""Focused stdlib tests for the local MCP collaboration bridge."""
import tempfile
import unittest
from pathlib import Path

import agent_bridge_mcp as bridge


class AgentBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        bridge.ROOT = root
        bridge.RUNTIME = root / ".agent-bridge" / "runtime"
        bridge.DB_PATH = bridge.RUNTIME / "test.sqlite3"
        (root / "project-memory").mkdir(parents=True)
        (root / "project-memory" / "00-START-HERE.md").write_text("# Test memory", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_message_round_trip(self):
        sent = bridge.call_tool("send_agent_message", {
            "sender": "kilo", "recipient": "antigravity",
            "subject": "API handoff", "message": "Please review the product response schema."
        })
        inbox = bridge.call_tool("get_agent_inbox", {"agent": "antigravity"})
        self.assertEqual(inbox[0]["id"], sent["message_id"])
        self.assertEqual(inbox[0]["subject"], "API handoff")
        marked = bridge.call_tool("mark_message_read", {"message_id": sent["message_id"]})
        self.assertTrue(marked["marked_read"])
        self.assertEqual(bridge.call_tool("get_agent_inbox", {"agent": "antigravity"}), [])

    def test_task_claim_is_persisted(self):
        created = bridge.call_tool("create_shared_task", {
            "creator": "human", "owner": "kilo", "title": "Wire product page",
            "description": "Connect the product detail page to the documented API.",
            "acceptance_criteria": ["Loading state works", "API errors are shown safely"],
            "related_files": ["src/pages/ProductDetail.jsx"]
        })
        claimed = bridge.call_tool("claim_shared_task", {
            "task_id": created["task_id"], "agent": "kilo"
        })
        self.assertEqual(claimed["status"], "in_progress")
        with self.assertRaises(ValueError):
            bridge.call_tool("claim_shared_task", {
                "task_id": created["task_id"], "agent": "antigravity"
            })

    def test_activity_and_context(self):
        bridge.call_tool("record_agent_activity", {
            "agent": "antigravity", "summary": "Added product validation",
            "files": ["backend/shop/serializers.py"], "tests": ["python manage.py test"],
            "result": "not_run"
        })
        activity = bridge.call_tool("get_recent_agent_activity", {})
        self.assertEqual(activity[0]["agent"], "antigravity")
        context = bridge.call_tool("get_project_context", {"sections": ["start"]})
        self.assertIn("# Test memory", context)


if __name__ == "__main__":
    unittest.main()
