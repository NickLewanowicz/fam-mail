#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NIGHTSHIFT_DIR="${NIGHTSHIFT_DIR:-$HOME/Documents/Projects/nightshift}"
CONFIG_PATH="$PROJECT_DIR/.claude/nightshift.yaml"
LOG_DIR="$PROJECT_DIR/logs/nightshift"
PID_FILE="$LOG_DIR/nightshift.pid"
PROGRESS_FILE="$PROJECT_DIR/nightshift-progress.json"

echo "=== Nightshift Status ==="
echo ""

# Check if nightshift is running
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Process:  RUNNING (PID $PID)"
    ELAPSED=$(ps -o etime= -p "$PID" 2>/dev/null | tr -d ' ')
    echo "Uptime:   $ELAPSED"
  else
    echo "Process:  NOT RUNNING (stale PID file)"
  fi
else
  echo "Process:  NOT RUNNING"
fi
echo ""

# Worktrees
echo "--- Worktrees ---"
WT_COUNT=$(cd "$PROJECT_DIR" && git worktree list | wc -l | tr -d ' ')
if [[ "$WT_COUNT" -gt 1 ]]; then
  cd "$PROJECT_DIR" && git worktree list | tail -n +2
else
  echo "(none)"
fi
echo ""

# Nightshift branches
echo "--- Nightshift Branches ---"
BRANCHES=$(cd "$PROJECT_DIR" && git branch --list 'nightshift/*' 2>/dev/null || true)
if [[ -n "$BRANCHES" ]]; then
  echo "$BRANCHES"
else
  echo "(none)"
fi
echo ""

# Progress summary
echo "--- Progress ---"
if [[ -f "$PROGRESS_FILE" ]]; then
  if command -v jq &>/dev/null; then
    CYCLES=$(jq -r '.cycles // 0' "$PROGRESS_FILE")
    ATTEMPTED=$(jq -r '.issuesAttempted | length // 0' "$PROGRESS_FILE")
    CLOSED=$(jq -r '.issuesClosed | length // 0' "$PROGRESS_FILE")
    TOOLS=$(jq -r '.totalTools // 0' "$PROGRESS_FILE")
    echo "Cycles:    $CYCLES"
    echo "Attempted: $ATTEMPTED issues"
    echo "Closed:    $CLOSED issues"
    echo "Tools:     $TOOLS total calls"
  else
    cat "$PROGRESS_FILE"
  fi
else
  echo "(no progress file)"
fi
echo ""

# Last log lines
echo "--- Last 10 Log Lines ---"
if [[ -f "$LOG_DIR/nightshift.log" ]]; then
  tail -10 "$LOG_DIR/nightshift.log"
else
  echo "(no log file)"
fi
