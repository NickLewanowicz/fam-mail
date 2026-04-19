#!/bin/bash
# Poll an OpenCode session for progress
# Usage: ./scripts/poll-session.sh <session_id> [interval_seconds]

SESSION_ID="${1:?Usage: $0 <session_id> [interval_seconds]}"
INTERVAL="${2:-15}"
BASE_URL="http://127.0.0.1:4096"
PREV_PARTS=0

echo "=== Polling session: $SESSION_ID ==="
echo "Interval: ${INTERVAL}s"
echo ""

while true; do
    STATUS=$(curl -s "$BASE_URL/session/$SESSION_ID/message" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo "[$(date +%H:%M:%S)] Server unreachable"
        sleep "$INTERVAL"
        continue
    fi

    MSG_COUNT=$(echo "$STATUS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)
    
    SUMMARY=$(echo "$STATUS" | python3 -c "
import json, sys
messages = json.load(sys.stdin)
total_parts = 0
tool_calls = []
texts = []
for msg in messages:
    info = msg.get('info', {})
    parts = msg.get('parts', [])
    role = info.get('role', '?')
    for p in parts:
        total_parts += 1
        ptype = p.get('type', '?')
        if ptype == 'tool-invocation':
            name = p.get('toolName', '?')
            state = p.get('state', '?')
            tool_calls.append(f'{name}({state})')
        elif ptype == 'text' and role == 'assistant':
            texts.append(p.get('text', '')[:100])

print(f'Messages: {len(messages)} | Parts: {total_parts}')
if tool_calls:
    print(f'Tools: {\" → \".join(tool_calls[-5:])}')
if texts:
    for t in texts[-2:]:
        print(f'Text: {t}')
" 2>/dev/null)
    
    CURRENT_PARTS=$(echo "$SUMMARY" | head -1 | grep -o 'Parts: [0-9]*' | grep -o '[0-9]*')
    
    if [ "$CURRENT_PARTS" != "$PREV_PARTS" ]; then
        echo ""
        echo "[$(date +%H:%M:%S)] === Progress ==="
        echo "$SUMMARY"
        PREV_PARTS="$CURRENT_PARTS"
    else
        echo -n "."
    fi
    
    # Check if session seems done (last message is assistant with text and no pending tools)
    IS_DONE=$(echo "$STATUS" | python3 -c "
import json, sys
messages = json.load(sys.stdin)
if not messages:
    print('no')
    sys.exit()
last = messages[-1]
parts = last.get('parts', [])
if not parts:
    print('no')
    sys.exit()
has_pending_tool = any(p.get('state') in ('pending', 'running') for p in parts if p.get('type') == 'tool-invocation')
has_text = any(p.get('type') == 'text' for p in parts)
if has_text and not has_pending_tool and last.get('info', {}).get('role') == 'assistant':
    print('yes')
else:
    print('no')
" 2>/dev/null)
    
    if [ "$IS_DONE" = "yes" ]; then
        echo ""
        echo "[$(date +%H:%M:%S)] === Session Complete ==="
        echo "$SUMMARY"
        break
    fi
    
    sleep "$INTERVAL"
done
