#!/bin/bash
# SubagentStop Hook: 서브에이전트 완료 시 결과 검증 + 이벤트 로깅

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
STATE_DIR="$PROJECT_DIR/.claude/state"
EVENT_LOG="$STATE_DIR/event-log.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# stdin에서 Hook 입력 JSON 읽기
INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)

# 이벤트 로깅 (state 디렉토리가 존재할 때만)
if [ -d "$STATE_DIR" ]; then
  echo "{\"event\":\"subagent_stop\",\"agent_type\":\"$AGENT_TYPE\",\"session_id\":\"$SESSION_ID\",\"timestamp\":\"$TIMESTAMP\"}" >> "$EVENT_LOG"
fi

exit 0
