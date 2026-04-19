#!/bin/bash
# Start the Fam-Mail Agent Orchestrator
# Usage: ./scripts/start-orchestrator.sh [--verbose] [--dry-run] [--status]
#
# This script:
# 1. Ensures the OpenCode server is running
# 2. Starts the orchestrator Python process
# 3. Logs everything to logs/orchestrator.log
# 4. Handles graceful shutdown on SIGINT/SIGTERM

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR/sessions"

cd "$PROJECT_DIR"

echo "╔══════════════════════════════════════════╗"
echo "║  Fam-Mail Agent Orchestrator Launcher    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v opencode >/dev/null 2>&1 || { echo "ERROR: opencode not found"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "ERROR: gh CLI not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 not found"; exit 1; }

# Check if server is already running
if curl -s http://127.0.0.1:4096/global/health >/dev/null 2>&1; then
    echo "✓ OpenCode server already running"
else
    echo "Starting OpenCode server..."
    opencode serve --port 4096 &
    SERVE_PID=$!
    echo "  Server PID: $SERVE_PID"

    for i in $(seq 1 30); do
        if curl -s http://127.0.0.1:4096/global/health >/dev/null 2>&1; then
            echo "  ✓ Server ready"
            break
        fi
        sleep 1
    done

    if ! curl -s http://127.0.0.1:4096/global/health >/dev/null 2>&1; then
        echo "ERROR: Server failed to start"
        exit 1
    fi
fi

echo ""
echo "Starting orchestrator..."
echo "  Log: $LOG_DIR/orchestrator.log"
echo "  Changelog: $PROJECT_DIR/CHANGELOG_AGENT.md"
echo "  Progress: $PROJECT_DIR/agent-progress.json"
echo ""
echo "Press Ctrl+C to stop gracefully."
echo ""

exec python3 "$SCRIPT_DIR/orchestrator.py" "$@" 2>&1 | tee -a "$LOG_DIR/orchestrator.log"
