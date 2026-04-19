#!/bin/bash
# Monitor OpenCode sessions and logs for the fam-mail project
# Usage: ./scripts/monitor-opencode.sh [watch|status|errors|sessions|tail]

LOG_DIR="$HOME/.local/share/opencode/log"
SESSION_DIR="$HOME/.local/share/opencode/sessions"

case "${1:-status}" in
  status)
    echo "=== OpenCode Monitor ==="
    echo ""
    echo "--- Latest Log File ---"
    LATEST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
      echo "File: $LATEST_LOG"
      echo "Size: $(wc -c < "$LATEST_LOG") bytes"
      echo "Lines: $(wc -l < "$LATEST_LOG")"
      echo ""
      echo "--- Error Count ---"
      echo "ERROR lines: $(grep -c '^ERROR' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "429 (rate limit): $(grep -c '"statusCode":429' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "500 (server): $(grep -c '"statusCode":500' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo ""
      echo "--- Tool Calls ---"
      echo "bash calls: $(grep -c 'tool=bash' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "read calls: $(grep -c 'tool=read' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "write calls: $(grep -c 'tool=write' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "edit calls: $(grep -c 'tool=edit' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo "task calls: $(grep -c 'tool=task' "$LATEST_LOG" 2>/dev/null || echo 0)"
      echo ""
      echo "--- MCP Status ---"
      grep 'service=mcp' "$LATEST_LOG" | grep -o 'key=[^ ]*' | sort -u
      echo ""
      echo "--- Last 5 Log Lines ---"
      tail -5 "$LATEST_LOG"
    else
      echo "No log files found in $LOG_DIR"
    fi
    ;;

  errors)
    echo "=== OpenCode Errors ==="
    LATEST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
      grep '^ERROR' "$LATEST_LOG" | while IFS= read -r line; do
        timestamp=$(echo "$line" | grep -o '2026-[^ ]*')
        status=$(echo "$line" | grep -o '"statusCode":[0-9]*' | head -1)
        msg=$(echo "$line" | grep -o '"message":"[^"]*"' | head -1)
        model=$(echo "$line" | grep -o 'modelID=[^ ]*' | head -1)
        echo "[$timestamp] $status $model $msg"
      done
    fi
    ;;

  tail)
    echo "=== Tailing Latest OpenCode Log ==="
    LATEST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
      echo "Following: $LATEST_LOG"
      tail -f "$LATEST_LOG"
    fi
    ;;

  watch)
    echo "=== Watching OpenCode (refreshes every 10s) ==="
    while true; do
      clear
      bash "$0" status
      echo ""
      echo "--- Active OpenCode processes ---"
      ps aux | grep -v grep | grep opencode | awk '{print $2, $11, $12, $13}' || echo "None"
      echo ""
      echo "[$(date)] Refreshing in 10s..."
      sleep 10
    done
    ;;

  sessions)
    echo "=== OpenCode Sessions ==="
    if [ -d "$SESSION_DIR" ]; then
      ls -lt "$SESSION_DIR" | head -20
    else
      echo "No session directory found at $SESSION_DIR"
      echo "Sessions may be stored elsewhere. Check:"
      find "$HOME/.local/share/opencode" -name "*.json" -newer "$HOME/.local/share/opencode/log" 2>/dev/null | head -10
    fi
    ;;

  *)
    echo "Usage: $0 [status|errors|tail|watch|sessions]"
    echo "  status   - Show current status summary (default)"
    echo "  errors   - Show all errors from latest log"
    echo "  tail     - Follow the latest log file"
    echo "  watch    - Auto-refresh status every 10s"
    echo "  sessions - List recent sessions"
    ;;
esac
