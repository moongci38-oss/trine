# 세션 작업 워크플로우 (Trine v2.0)

> **운영 모델**: AI가 현재 Phase를 인지하고, 완료 시 다음 Phase로 이동을 제안한다. Human 승인 후 진행한다.

## Phase 1: 작업 요청 및 세션 이해

1. Human이 개발 계획서의 특정 세션을 AI에게 작업 요청
2. AI가 계획문서에서 해당 세션 내용을 정확히 숙지하고 세션 요약 출력
3. 세션 상태 초기화 (`node ~/.claude/scripts/session-state.mjs init --name <name>`)
4. **[STOP] 작업 규모 분류 승인** (Hotfix/Standard)
5. (Standard만) **codebase-analyzer** Subagent 스폰
   - 세션 범위(대상 모듈/파일)를 프롬프트로 전달
   - Subagent가 7축 분석 리포트를 `docs/reviews/`에 자동 저장
   - Lead는 요약(~300토큰)만 수신 (컨텍스트 절약)
   - Hotfix → 스킵 (오버헤드 방지)
   - 분석 결과는 Phase 1.5 Q&A와 Phase 2 Spec 작성의 참고 자료로 활용
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

### Superpowers 스킬 연동 (Phase 3 전체)

구현 단계에서 아래 superpowers 스킬을 명시적으로 호출하여 품질을 강화한다:

| 시점 | 스킬 | 역할 |
|------|------|------|
| 구현 시작 시 | `superpowers:test-driven-development` | RED→GREEN→REFACTOR 사이클 강제. Check 3.5T 사후 검증만으로 불충분한 TDD 사전 예방 |
| 태스크별 구현 | `superpowers:subagent-driven-development` | 태스크마다 서브에이전트 스폰 + Spec/Code 2단계 리뷰. 전체 완료 후 1회 리뷰보다 결함 조기 발견에 우수 |
| 디버깅 발생 시 | `superpowers:systematic-debugging` | 4단계 디버깅 프로토콜 + 3회 실패 시 아키텍처 재검토 |
| 구현 완료 선언 시 | `superpowers:verification-before-completion` | 증거 기반 완료 선언 — "should work" 금지, 실행 결과로 입증 |

### 보안 예방 레이어

| 기존 (사후 검증) | 추가 (사전 예방) |
|-----------------|----------------|
| Check 3.8 `/trine-check-security` | `security-guidance` 플러그인 — 코드 작성 시점에 예방적 보안 패턴 경고 (Defense-in-Depth) |

1. AI가 Spec 기준으로 구현 (의존성 없는 태스크만 병렬 Agent Teams — Wave 단위 스폰)
2. 구현 완료 후 병렬 실행:
   a. **Walkthrough 작성** → `docs/walkthroughs/` (`technical-writer` Subagent 위임 권장)
   b. **Check 3**: `verify.sh code` (프로젝트별 — test/lint/build + 브랜치/커밋 규칙)
   - Check 3 실패 → 1회 자동 수정 → 재실행. 실패 시 **[STOP]** Human 보고
3. Check 3 PASS 후 순차 실행:
   - **Check 3.5** (트레이서빌리티, `spec-compliance-checker` 스킬 참조)
   - **Check 3.7** (코드 리뷰, `code-reviewer` 에이전트 스폰)
   - 확장 체크(3.6/3.7P/3.8)는 수요 확인 후 단계적 추가
4. Auto-fix: 실패 시 1회 수정 시도 → 실패 시 **[STOP]** Human 에스컬레이션

### Frontend 점진적 품질 루프 (UI 파일 변경 시)

UI 컴포넌트/페이지를 구현할 때 아래 루프를 단위별로 반복한다.
"전부 구현 후 사후 검증"이 아니라 **컴포넌트 단위로 구현→확인→수정**을 반복하여 최상급 퀄리티를 달성한다.

#### 루프 사이클 (컴포넌트/페이지 단위)

1. **디자인 결정**: `frontend-design` Skill 로드 → 디자인 방향 결정
   - 타이포그래피, 컬러, 모션, 레이아웃 전략
   - 디자인 토큰(@theme, CSS 변수) 우선 정의
   - AI 슬롭 회피 (generic 폰트, 뻔한 색상 금지)
1.5. **Stitch UI 생성** (UI 컴포넌트/페이지 구현 시에만 — API/백엔드 스킵):
   - Stitch MCP `list_projects` → 해당 프로젝트 선택 (또는 새 프로젝트 생성)
   - 텍스트 프롬프트로 화면 레이아웃 생성 (디자인 결정 사항 반영)
   - `get_screen_code`로 생성된 HTML/CSS 추출
   - `get_screen_image`로 스크린샷 추출 → 레퍼런스 이미지로 활용
   - 추출된 코드를 Next.js 컴포넌트로 리팩토링 기반으로 활용 (복사가 아닌 참조)
   - **적용 프로젝트**: Portfolio (Next.js). GodBlade (Unity)는 UI 레퍼런스 용도만
   - **Stitch 미가용 시**: 스킵하고 2단계로 직접 진행 (기존 워크플로우 유지)
2. **구현**: Stitch 코드 기반으로 Next.js 컴포넌트 리팩토링 + 비즈니스 로직 구현
   - Stitch 출력물은 정적 HTML/CSS → React 컴포넌트화 + 상태 관리 + API 연동 필요
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

### 완료 경로 선택 (Phase 4 시작 시)

구현 완료 후 아래 4가지 선택지를 Human에게 제시한다:
1. **PR 생성** → 기본 경로 (아래 절차 진행)
2. **로컬 merge** → 로컬에서 직접 merge (CI 불필요한 소규모 변경)
3. **브랜치 유지** → 추가 작업 예정 시 브랜치만 유지
4. **브랜치 폐기** → 실험/탐색 브랜치 정리

### PR 생성 절차 (선택지 1)

1. AI가 커밋 생성 (Conventional Commits)
2. AI가 `gh pr create`로 PR 생성 + URL 반환
3. **Check 5 (PR Health Check)**:
   a. `gh pr view` + `gh pr checks`로 PR 상태 확인
   b. merge conflict → rebase → 충돌 해결
   c. CI 실패 → 로그 분석 → 코드 수정 → 새 커밋 push
   d. PR 본문 체크리스트 미완료 → 자동 채움
4. (선택적) `code-review` 플러그인 `/code-review` — Check 5 통과 후 GitHub PR에 자동 리뷰 코멘트 게시 (Human 승인 후)
5. **[STOP]** Human이 PR 검토 + Merge
6. (조건부) Human 리뷰 코멘트 대응 → `superpowers:receiving-code-review` 프로토콜 적용:
   - 감사 표현 금지, 기술적 반박만 허용
   - YAGNI 체크 — 리뷰어 제안이 범위 초과인지 판단
   - 모든 코멘트에 코드 변경 또는 기술적 근거로 응답
7. 세션 종료
   ─── checkpoint: state=session_complete ───

### 비-Trine 세션에서 활용 가능한 superpowers 스킬 (파이프라인 외)

| 스킬 | 활용 시점 |
|------|----------|
| `brainstorming` | 기획서 없이 아이디어에서 설계를 시작할 때 (SIGIL 이전 단계) |
| `writing-plans` | Spec과 별도로 구현 상세 계획(How+코드)이 필요할 때 |
| `finishing-a-development-branch` | 로컬 merge, 워크트리 정리 등 PR 외 선택지가 필요할 때 |
| `using-git-worktrees` | 여러 기능을 물리적으로 격리하여 병렬 개발할 때 |
| `writing-skills` | 새 스킬 작성 시 TDD 방법론 적용 |
