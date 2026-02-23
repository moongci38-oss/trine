---
description: Trine 워크플로우 시작 — Phase 1→4 파이프라인 실행
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, WebSearch, WebFetch
argument-hint: <작업 설명> or --size <hotfix|small|standard|multi-spec>
---

# /trine — Trine 워크플로우 시작

Trine SDD+DDD+TDD 파이프라인을 시작합니다.

## 실행 순서

1. 세션 초기화:
   ```bash
   node ~/.claude/scripts/session-state.mjs init --name <작업명>
   ```

2. 작업 규모 분류 (자동 또는 `--size` 인자):
   - **hotfix**: 긴급 수정 (Phase 1.5/2 스킵 가능)
   - **small**: 소규모 기능 (간소화된 Spec)
   - **standard**: 표준 기능 (전체 Phase)
   - **multi-spec**: 대규모 (Plan/Task 분할 필수)

3. `/trine-pipeline` 프롬프트를 기반으로 Phase 1부터 순차 진행

## Phase 흐름

| Phase | 작업 | Check |
|-------|------|-------|
| 1 | 세션 이해 + 컨텍스트 파악 | - |
| 1.5 | 요구사항 분석 (Q&A) | - |
| 2 | Spec/Plan 작성 + Human 승인 | - |
| 3 | 구현 + 검증 | Check 3→3.5→3.6/3.7/3.8 |
| 4 | PR 생성 | - |

## 규칙

- Phase 전환 시 자동 체크포인트 생성
- Check 3 실패 시 최대 3회 autoFix 순환
- Human 승인 게이트: Phase 2 완료 시 필수
- 세션 재개: `/trine-resume` 사용
