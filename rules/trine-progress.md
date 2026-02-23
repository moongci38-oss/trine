# Progress Auto-Management Rules

## 개요

브랜치 생성/PR merge 시 PM 문서(progress.md, development-plan.md)의 진행상태가 자동으로 업데이트된다.

## 상태 전환

```
⬜ pending → 🔄 in-progress → ✅ completed
              ↖── 재작업 시 ──↙
```

## 자동 트리거

| 이벤트 | 상태 변경 |
|--------|----------|
| 브랜치 생성 (`feat/xxx`) | 관련 항목 → 🔄 in-progress |
| PR merge to develop | 관련 항목 → ✅ completed |
| 재작업 (같은 브랜치 재생성) | 관련 항목 → 🔄 in-progress |

## Phase Checkpoint 연동

| Checkpoint | 진행 상태 영향 |
|-----------|--------------|
| `phase1_complete` | 관련 항목 → 🔄 |
| `phase1.5_complete` | — |
| `phase2_complete` | — |
| `phase3_complete` | — |
| `session_complete` | 관련 항목 → ✅ |

## 매핑 파일

`.claude/progress-mapping.json`에 브랜치명 ↔ 문서 항목 매핑이 정의된다.

### 자동 생성

매핑은 두 곳에서 자동 생성:

1. **Phase 2 문서 작성 시**: Spec 초기화 시 계획서를 스캔하여 매핑 자동 생성
2. **fallback**: 매핑이 없을 때 계획서에서 키워드 매칭으로 자동 생성

자동 감지 실패 시 수동으로 매핑을 추가해야 한다.

## PM 문서 자동 갱신

`trine-pm-updater` 에이전트가 Phase 전환 시 PM 문서를 자동 갱신한다:

| 이벤트 | progress.md | development-plan.md |
|--------|:-----------:|:-------------------:|
| 세션 시작 (init) | - | 새 세션 항목 추가 |
| Phase 전환 (checkpoint) | 체크박스 완료 변경 | Phase 상태 업데이트 |
| Check 결과 | 결과 기록 | - |
| 세션 완료 (complete) | PR 번호 기록 | 완료 상태 + 소요 시간 |

## AI 에이전트 행동 규칙

1. **브랜치 생성 직후**: 진행 상태 업데이트
2. **PR 생성 전**: 문서 상태 확인
3. **PR merge 후**: 완료 상태 업데이트
4. **재작업 시**: in-progress로 복귀
