# 세션 작업 워크플로우 (Trine v2.0)

## Phase 1: 작업 요청 및 세션 이해

1. Human이 개발 계획서의 특정 세션을 AI에게 작업 요청
2. AI가 계획문서에서 해당 세션 내용을 정확히 숙지하고 세션 요약 출력
3. 세션 상태 초기화 (`node ~/.claude/scripts/session-state.mjs init --name <name>`)
4. **[STOP] 작업 규모 분류 승인** (Hotfix/Small/Standard/Multi-Spec)
   ─── checkpoint: state=phase1_complete ───

## Phase 1.5: 요구사항 분석

> 기획서의 모호한 요구사항을 구현 전에 해소. → `trine-requirements-analysis.md` 규칙 참조.

1. 기획서 읽기 + 불명확점 식별
2. 질문 수 판정: 0개(스킵) / 1~3개(Q&A) / 4~5개(Q&A+보완 권고) / 6+개([STOP] 반려)
3. 인터랙티브 Q&A 실행
4. 트레이서빌리티 매트릭스 생성 (프로젝트별 스크립트 또는 AI 추출)
5. 저장: `.specify/traceability/{name}-matrix.json`
   ─── checkpoint: state=phase1.5_complete ───

## Phase 2: 문서 작성 (Spec → Plan(조건부) → Task(조건부))

> Plan/Task는 conditional. 멀티도메인/아키결정/10+파일 시 필수.

1. AI가 **Spec.md** 작성 (`.specify/specs/`에 저장)
2. AI가 복잡도 판단
   - Plan 필요 → Plan.md 작성 (`.specify/plans/`)
   - Plan 불필요 → 4단계
3. (조건부) AI가 **Plan.md** 작성 (테스트 분류 포함)
4. 3관점 검증: Spec(S-1~S-8), Plan(P-1~P-5), Task(T-1~T-4)
   - **통과** → 5단계
   - **실패** → 1단계 복귀
5. **[STOP]** Human이 Spec(+Plan) 승인 — GATE 1 승인 패키지
   - **승인** → 6단계
   - **반려** → 1단계 복귀
6. (조건부) AI가 **Task.md** 작성 — 3+ 병렬 에이전트 필요 시만
7. (조건부) **[STOP]** Human이 Task 최종 승인
   ─── checkpoint: state=phase2_complete ───

## Phase 3: 구현 + AI 자동 검증

1. AI가 Spec 기준으로 구현 (의존성 없는 태스크만 병렬 Agent Teams — Wave 단위 스폰)
2. AI가 **Walkthrough 작성 (필수)** → `docs/walkthroughs/`
3. **Check 3**: `verify.sh code` (프로젝트별 — test/lint/build)
   - 실패 → 자동 수정 → 재실행 (최대 3회)
4. **Check 3.5**: 트레이서빌리티 매트릭스 vs Spec 추적성 검증
   - 결함 → 자동 수정 → Walkthrough 업데이트 → 재검증
5. **Check 3.6** (UI/UX 품질) — Subagent 격리 실행
6. **Check 3.7** (코드 품질) — Subagent 격리 실행 (3.6과 병렬)
7. **Check 3.8** (보안) — Subagent 격리 실행 (3.6/3.7과 병렬)
8. Auto-fix: 실패 시 3회 재시도 → Smoke Test (Check 3만) → Phase 롤백
   ─── checkpoint: state=phase3_complete ───

## Phase 4: PR 생성 및 완료

1. **Check 4**: 커밋 메시지 규칙, 브랜치 네이밍, 변경 파일 목록 최종 체크
   - **통과** → 2단계
   - **실패** → Phase 3 복귀
2. AI가 커밋 생성 (Conventional Commits)
3. AI가 `gh pr create`로 PR 생성 + URL 반환
4. **Check 5 (PR Health Check)**:
   a. `gh pr view` + `gh pr checks`로 PR 상태 확인
   b. merge conflict → rebase → 충돌 해결
   c. CI 실패 → 로그 분석 → 코드 수정 → 새 커밋 push
   d. PR 본문 체크리스트 미완료 → 자동 채움
5. **[STOP]** Human이 PR 검토 + Merge
6. (조건부) Human 리뷰 코멘트 대응 → AI 수정 → 재검토
7. 세션 종료
   ─── checkpoint: state=session_complete ───
