#!/usr/bin/env python3
"""Watch an OpenCode session and report progress."""
import json
import sys
import time
import urllib.request

BASE_URL = "http://127.0.0.1:4096"

def fetch(path):
    try:
        req = urllib.request.Request(f"{BASE_URL}{path}")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return None

def summarize_session(session_id, depth=0):
    prefix = "  " * depth
    msgs = fetch(f"/session/{session_id}/message")
    if not msgs:
        print(f"{prefix}No messages")
        return

    for msg in msgs:
        info = msg.get("info", {})
        parts = msg.get("parts", [])
        role = info.get("role", "?")
        model = info.get("modelID", "")
        tokens = info.get("tokens", {})
        out_tokens = tokens.get("output", 0)

        tool_parts = [p for p in parts if p.get("type") in ("tool-invocation", "tool")]
        text_parts = [p for p in parts if p.get("type") == "text"]
        subtask_parts = [p for p in parts if p.get("type") == "subtask"]

        if role == "user" and depth == 0:
            for p in text_parts:
                t = p.get("text", "")
                print(f"{prefix}[USER] {t[:120]}...")
            continue

        if role == "assistant":
            tools_str = ""
            if tool_parts:
                tool_names = []
                for tp in tool_parts:
                    name = tp.get("toolName", tp.get("tool", "?"))
                    state = tp.get("state", "?")
                    tool_names.append(f"{name}({state})")
                tools_str = f" tools=[{', '.join(tool_names)}]"

            for p in text_parts:
                t = p.get("text", "").strip()
                if t:
                    lines = t.split("\n")
                    first_line = lines[0][:120]
                    print(f"{prefix}[GLM] {first_line}{tools_str}")
                    if len(lines) > 3:
                        print(f"{prefix}  ... ({len(lines)} lines, {len(t)} chars)")

    children = fetch(f"/session/{session_id}/children")
    if children:
        for child in children:
            cid = child["id"]
            title = child.get("title", "")
            print(f"{prefix}  └─ Subtask: {title}")
            summarize_session(cid, depth + 1)


def main():
    session_id = sys.argv[1] if len(sys.argv) > 1 else None
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    if not session_id:
        sessions = fetch("/session")
        if sessions:
            print("Active sessions:")
            for s in sessions[-5:]:
                print(f"  {s['id']} - {s.get('title', '')}")
        return

    prev_msg_count = 0
    while True:
        print(f"\n{'='*60}")
        print(f"Session: {session_id} | {time.strftime('%H:%M:%S')}")
        print(f"{'='*60}")

        msgs = fetch(f"/session/{session_id}/message")
        if msgs:
            msg_count = len(msgs)
            total_out_tokens = sum(
                m.get("info", {}).get("tokens", {}).get("output", 0)
                for m in msgs
            )
            total_tools = sum(
                sum(1 for p in m.get("parts", []) if p.get("type") in ("tool", "tool-invocation"))
                for m in msgs
            )
            print(f"Messages: {msg_count} | Output tokens: {total_out_tokens} | Tool calls: {total_tools}")
            print()

            summarize_session(session_id)

            if msg_count == prev_msg_count:
                print(f"\n(no change)")
            prev_msg_count = msg_count

        time.sleep(interval)


if __name__ == "__main__":
    main()
