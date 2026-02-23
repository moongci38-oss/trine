#!/bin/bash
# SessionStart Hook: 세션 시작 시 프로젝트 컨텍스트 자동 주입
# Phase 1 "세션 이해" 시간 단축 목적
# 관리 스크립트: ~/.claude/scripts/session-state.mjs (전역)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# 1. Git 상태
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")
STATUS=$(git -C "$PROJECT_DIR" status --short 2>/dev/null | head -20)

# 2. 멀티세션 상태 확인
SESSIONS_DIR="$PROJECT_DIR/.claude/state/sessions"

echo "=== Trine Project Context (auto-injected) ==="
echo "Branch: $BRANCH"

if [ -d "$SESSIONS_DIR" ]; then
  COUNT=$(ls -1 "$SESSIONS_DIR"/*.json 2>/dev/null | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    echo "Active sessions: $COUNT"
    for f in "$SESSIONS_DIR"/*.json; do
      NAME=$(basename "$f" .json)
      PHASE=$(jq -r '.currentPhase // "?"' "$f" 2>/dev/null)
      WORK_SIZE=$(jq -r '.workSize // "?"' "$f" 2>/dev/null)
      CYCLES=$(jq -r '.check3CycleCount // 0' "$f" 2>/dev/null)
      echo "  - $NAME: $PHASE ($WORK_SIZE) cycles=$CYCLES/3"
    done
  else
    echo "Sessions: none"
  fi
else
  echo "Sessions: none"
fi

# 3. Trine 동기화 상태 확인
if command -v node &>/dev/null && [ -f "$HOME/.claude/scripts/trine-sync.mjs" ]; then
  SYNC_STATUS=$(node "$HOME/.claude/scripts/trine-sync.mjs" status --quiet 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "⚠ Trine sync: outdated — run '/trine-sync' to update"
  fi
fi

if [ -n "$STATUS" ]; then
  echo "Git changes:"
  echo "$STATUS"
fi

exit 0
