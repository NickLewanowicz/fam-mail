#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NIGHTSHIFT_DIR="${NIGHTSHIFT_DIR:-$HOME/Documents/Projects/nightshift}"
CONFIG_PATH="$PROJECT_DIR/.claude/nightshift.yaml"
LOG_DIR="$PROJECT_DIR/logs/nightshift"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Start a nightshift orchestration run against this repo's GitHub issues.

Options:
  --dry-run     Print plan without executing agents or mutating issues
  --verbose     Enable verbose logging
  --rebuild     Rebuild nightshift from source before running
  --bg          Run in background (logs to $LOG_DIR/nightshift.log)
  -h, --help    Show this help

Prerequisites:
  - ZAI_API_KEY set in environment (or ~/.claude/settings.json)
  - pi CLI installed: pnpm add -g @mariozechner/pi-coding-agent
  - gh CLI authenticated: gh auth status
  - nightshift built: cd $NIGHTSHIFT_DIR && pnpm build

Environment:
  NIGHTSHIFT_DIR  Path to nightshift repo (default: ~/Documents/Projects/nightshift)
EOF
  exit 0
}

DRY_RUN=""
VERBOSE=""
REBUILD=false
BG=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN="--dry-run"; shift ;;
    --verbose)  VERBOSE="--verbose"; shift ;;
    --rebuild)  REBUILD=true; shift ;;
    --bg)       BG=true; shift ;;
    -h|--help)  usage ;;
    *)          echo "Unknown option: $1"; usage ;;
  esac
done

if [[ ! -d "$NIGHTSHIFT_DIR" ]]; then
  echo "ERROR: nightshift repo not found at $NIGHTSHIFT_DIR"
  echo "Set NIGHTSHIFT_DIR to the correct path."
  exit 1
fi

if ! command -v pi &>/dev/null; then
  echo "ERROR: pi CLI not found. Install with: pnpm add -g @mariozechner/pi-coding-agent"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "ERROR: gh CLI not authenticated. Run: gh auth login"
  exit 1
fi

if [[ "$REBUILD" == true ]]; then
  echo "Building nightshift..."
  (cd "$NIGHTSHIFT_DIR" && pnpm build)
fi

if [[ ! -f "$NIGHTSHIFT_DIR/dist/index.js" ]]; then
  echo "nightshift not built. Building..."
  (cd "$NIGHTSHIFT_DIR" && pnpm build)
fi

mkdir -p "$LOG_DIR"

NIGHTSHIFT_BIN="node $NIGHTSHIFT_DIR/dist/index.js"

if [[ "$BG" == true ]]; then
  echo "Starting nightshift in background..."
  cd "$PROJECT_DIR"
  nohup $NIGHTSHIFT_BIN run --config "$CONFIG_PATH" $DRY_RUN $VERBOSE \
    >> "$LOG_DIR/nightshift.log" 2>&1 &
  echo $! > "$LOG_DIR/nightshift.pid"
  echo "PID: $(cat "$LOG_DIR/nightshift.pid")"
  echo "Logs: tail -f $LOG_DIR/nightshift.log"
else
  cd "$PROJECT_DIR"
  exec $NIGHTSHIFT_BIN run --config "$CONFIG_PATH" $DRY_RUN $VERBOSE
fi
