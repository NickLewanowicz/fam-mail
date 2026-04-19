#!/bin/bash
# Run an OpenCode command with proper settings for GLM 5.1
# Usage: ./scripts/run-opencode.sh "<prompt>" [model] [agent]
#
# Examples:
#   ./scripts/run-opencode.sh "Fix the CI pipeline"
#   ./scripts/run-opencode.sh "Implement issue #16" glm-5.1 implementer
#   ./scripts/run-opencode.sh "Run QA" glm-4.7 qa

set -e

PROMPT="${1:?Usage: $0 '<prompt>' [model] [agent]}"
MODEL="${2:-glm-5.1}"
AGENT="${3:-build}"
FULL_MODEL="zai-coding-plan/$MODEL"

cd "$(git rev-parse --show-toplevel)"

echo "=== OpenCode Runner ==="
echo "Model: $FULL_MODEL"
echo "Agent: $AGENT"
echo "Prompt: $PROMPT"
echo "Time: $(date)"
echo "========================"

# Create a log marker so we can find the session in logs
LOG_DIR="$HOME/.local/share/opencode/log"
echo "Logs: $LOG_DIR"
echo ""
echo "To monitor: ./scripts/monitor-opencode.sh watch"
echo "To tail log: ./scripts/monitor-opencode.sh tail"
echo ""

exec opencode run \
  --dangerously-skip-permissions \
  --print-logs \
  --model "$FULL_MODEL" \
  --agent "$AGENT" \
  "$PROMPT"
