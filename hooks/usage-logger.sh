#!/usr/bin/env bash
# usage-logger.sh — PostToolUse Hook
# 도구 사용 이벤트를 usage.log에 JSONL 형식으로 기록
# Graceful degradation: 에러 시 조용히 종료

PROJECT_ROOT="${PWD}"
SPECIFY_DIR="${PROJECT_ROOT}/.specify"

# Trine 프로젝트가 아니면 스킵
[[ -d "$SPECIFY_DIR" ]] || exit 0

USAGE_LOG="${PROJECT_ROOT}/.claude/usage.log"
mkdir -p "$(dirname "$USAGE_LOG")"

# 환경변수에서 도구 정보 추출
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
TOOL_RESULT="${CLAUDE_TOOL_RESULT:-unknown}"

# Check 실행 기록 (Check 3, 3.5, 3.7 등)
if [[ "$TOOL_NAME" == *"check"* ]] || [[ "$TOOL_NAME" == *"Check"* ]]; then
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"check_run\",\"tool\":\"${TOOL_NAME}\",\"result\":\"${TOOL_RESULT}\"}" >> "$USAGE_LOG" 2>/dev/null || true
fi

# Agent/Skill 사용 기록
if [[ "$TOOL_NAME" == "Agent" ]] || [[ "$TOOL_NAME" == "Skill" ]]; then
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"tool_use\",\"tool\":\"${TOOL_NAME}\"}" >> "$USAGE_LOG" 2>/dev/null || true
fi

exit 0
