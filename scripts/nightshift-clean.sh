#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NIGHTSHIFT_DIR="${NIGHTSHIFT_DIR:-$HOME/Documents/Projects/nightshift}"
LOG_DIR="$PROJECT_DIR/logs/nightshift"
PID_FILE="$LOG_DIR/nightshift.pid"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Clean up nightshift artifacts: worktrees, branches, PID files, and optionally logs.

Options:
  --logs        Also remove log files and session data
  --kill        Kill running nightshift process before cleanup
  --all         Kill + clean logs + remove progress/changelog files
  -h, --help    Show this help
EOF
  exit 0
}

CLEAN_LOGS=false
KILL=false
CLEAN_ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --logs)  CLEAN_LOGS=true; shift ;;
    --kill)  KILL=true; shift ;;
    --all)   CLEAN_ALL=true; KILL=true; CLEAN_LOGS=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

cd "$PROJECT_DIR"

# Kill running process if requested
if [[ "$KILL" == true ]] && [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Killing nightshift process (PID $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 1
    kill -9 "$PID" 2>/dev/null || true
  fi
fi

# Remove stale PID file
if [[ -f "$PID_FILE" ]]; then
  rm -f "$PID_FILE"
  echo "Removed PID file"
fi

# Remove worktrees
echo "Cleaning worktrees..."
WORKTREES=$(git worktree list --porcelain | grep '^worktree ' | sed 's/worktree //' | grep -v "^$PROJECT_DIR$" || true)
if [[ -n "$WORKTREES" ]]; then
  while IFS= read -r wt; do
    echo "  Removing: $wt"
    git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
  done <<< "$WORKTREES"
  git worktree prune
else
  echo "  (no worktrees to clean)"
fi

# Remove nightshift/* and issue-related branches
echo "Cleaning branches..."
for pattern in 'nightshift/*' 'nightshift-issue-*'; do
  BRANCHES=$(git branch --list "$pattern" 2>/dev/null | tr -d ' *' || true)
  if [[ -n "$BRANCHES" ]]; then
    while IFS= read -r branch; do
      echo "  Deleting branch: $branch"
      git branch -D "$branch" 2>/dev/null || true
    done <<< "$BRANCHES"
  fi
done

# Also clean any issue-number branches from the staff-engineer pattern
ISSUE_BRANCHES=$(git branch --list | tr -d ' *' | grep -E '^[0-9]+-' || true)
if [[ -n "$ISSUE_BRANCHES" ]]; then
  echo "  Found issue branches from previous runs:"
  while IFS= read -r branch; do
    echo "    $branch"
  done <<< "$ISSUE_BRANCHES"
  read -p "  Delete these branches? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    while IFS= read -r branch; do
      git branch -D "$branch" 2>/dev/null || true
    done <<< "$ISSUE_BRANCHES"
  fi
fi

# Clean worktree directories
for dir in "$PROJECT_DIR"/logs/nightshift/worktree-issue-* "$PROJECT_DIR"/../fam-mail-worktrees; do
  if [[ -d "$dir" ]]; then
    rm -rf "$dir"
    echo "Removed: $dir"
  fi
done

# Clean logs if requested
if [[ "$CLEAN_LOGS" == true ]]; then
  echo "Cleaning logs..."
  rm -rf "$LOG_DIR/sessions"
  rm -f "$LOG_DIR/nightshift.log"
  echo "  Cleared log files"
fi

# Clean everything if requested
if [[ "$CLEAN_ALL" == true ]]; then
  rm -f "$PROJECT_DIR/nightshift-progress.json"
  rm -f "$PROJECT_DIR/CHANGELOG_AGENT.md"
  echo "Removed progress and changelog files"
fi

echo ""
echo "Cleanup complete."
echo "Remaining state:"
git worktree list
git branch --list
