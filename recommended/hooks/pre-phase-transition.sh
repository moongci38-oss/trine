#!/usr/bin/env bash
# Hook: pre-phase-transition
# 트리거: Phase 전환 시 자동 체크포인트 + WIP 커밋
# 이벤트: PreToolUse (Bash 도구에서 session-state.mjs checkpoint 호출 감지)

set -euo pipefail

# session-state.mjs checkpoint 호출 감지
if echo "$TOOL_INPUT" | grep -q "session-state.mjs.*checkpoint"; then
  # 1. WIP 커밋 생성
  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  if [ "$BRANCH" != "unknown" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git add -A 2>/dev/null || true
    git commit -m "chore: WIP checkpoint (auto)" --no-verify 2>/dev/null || true
  fi

  # 2. 체크포인트 로그
  echo "[pre-phase-transition] Checkpoint saved at $(date -Iseconds)" >&2
fi
