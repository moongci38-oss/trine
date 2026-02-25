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
2. 구현 완료 후 병렬 실행:
   a. **Walkthrough 작성** → `docs/walkthroughs/` (`technical-writer` Subagent 위임 권장)
   b. **Check 3**: `verify.sh code` (프로젝트별 — test/lint/build + 브랜치/커밋 규칙)
   - Check 3 실패 → 자동 수정 → 재실행 (최대 3회)
3. Check 3 PASS 후 Subagent 병렬 실행 (2개 트랙):
   - **트랙 A** (순차): **Check 3.5** (트레이서빌리티, `/trine-check-traceability`) → **Check 3.5T** (테스트 품질, `test-quality-checker`)
   - **트랙 B** (병렬): **Check 3.6** (UI/UX, `/trine-check-ui`) | **Check 3.7** (코드 품질, code-reviewer) | **Check 3.7P** (성능, performance-checker) | **Check 3.8** (보안, `/trine-check-security`)
   - 트랙 A와 트랙 B는 동시 시작 (3.5T는 3.5 출력을 입력으로 사용하므로 3.5 이후 순차 실행)
   - Check 3.5T는 `.specify/test-quality-config.json` 존재 시에만 실행 (미존재 시 SKIP)
4. Auto-fix: 실패 시 Lead가 수정 → Smoke Test (Check 3만) → Check 3 ↔ 3.5 ↔ 3.5T 합산 3회 초과 시 Phase 롤백

### Frontend 점진적 품질 루프 (UI 파일 변경 시)

UI 컴포넌트/페이지를 구현할 때 아래 루프를 단위별로 반복한다.
"전부 구현 후 사후 검증"이 아니라 **컴포넌트 단위로 구현→확인→수정**을 반복하여 최상급 퀄리티를 달성한다.

#### 루프 사이클 (컴포넌트/페이지 단위)

1. **디자인 결정**: `frontend-design` Skill 로드 → 디자인 방향 결정
   - 타이포그래피, 컬러, 모션, 레이아웃 전략
   - 디자인 토큰(@theme, CSS 변수) 우선 정의
   - AI 슬롭 회피 (generic 폰트, 뻔한 색상 금지)
2. **구현**: 컴포넌트 코드 작성
   - Context7 MCP로 사용 라이브러리 최신 문서 참조
   - 접근성 속성(aria-label, role) 즉시 포함
3. **이미지 에셋** (필요 시): NanoBanana MCP
   - `/generate-image` 또는 `/trine-generate-image`로 생성
   - 생성 직후 이미지 품질 확인 (크기, 포맷, 해상도)
4. **시각 확인**: Playwright MCP로 렌더링 검증
   - 개발 서버 실행 중이면 navigate → resize → snapshot/screenshot
   - 최소 3개 뷰포트: Mobile(375x812), Tablet(768x1024), Desktop(1440x900)
   - 접근성 스냅샷(browser_snapshot)으로 시맨틱 구조 확인
5. **디자인 조정**: 시각적 문제 발견 시 수정 후 4번 재확인
6. **다음 단위**: 만족스러우면 다음 컴포넌트/페이지로 이동

#### 병렬화 (Agent Teams 사용 시)

- Teammate별 파일 소유권 분리 후 독립적으로 루프 실행 가능
- 각 Teammate가 자신의 컴포넌트에 대해 Playwright 시각 확인 독립 수행
- NanoBanana 이미지 생성은 별도 Teammate에 위임 가능 (구현과 병렬)

#### NanoBanana Visual QA (선택적)

- 구현된 UI 스크린샷을 Gemini Vision으로 품질 평가
- 디자인 의도 대비 시각적 일치도 점수화 가능
- NanoBanana 미가용 시 Playwright 스크린샷 + 수동 판단으로 대체

   ─── checkpoint: state=phase3_complete ───

## Phase 4: PR 생성 및 완료

1. AI가 커밋 생성 (Conventional Commits)
2. AI가 `gh pr create`로 PR 생성 + URL 반환
3. **Check 5 (PR Health Check)**:
   a. `gh pr view` + `gh pr checks`로 PR 상태 확인
   b. merge conflict → rebase → 충돌 해결
   c. CI 실패 → 로그 분석 → 코드 수정 → 새 커밋 push
   d. PR 본문 체크리스트 미완료 → 자동 채움
4. **[STOP]** Human이 PR 검토 + Merge
5. (조건부) Human 리뷰 코멘트 대응 → AI 수정 → 재검토
6. 세션 종료
   ─── checkpoint: state=session_complete ───
