# Trine 팀 온보딩 가이드

> Trine 개발 워크플로우를 팀원에게 배포하기 위한 종합 가이드.
> 이 문서는 `trine-sync`를 통해 각 프로젝트의 `docs/trine/`에 자동 배포됩니다.

---

## 1. Trine이란?

Trine은 **SDD(Spec-Driven Development) + DDD(Domain-Driven Design) + TDD(Test-Driven Development)** 3축을 융합한 AI-Native 개발 시스템이다.

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **Source of Truth** | `~/.claude/trine/` — 모든 규칙, 템플릿, 에이전트의 중앙 저장소 |
| **동기화 엔진** | `trine-sync.mjs` — 해시 비교 기반으로 변경분만 프로젝트에 배포 |
| **프로젝트 등록** | `manifest.json` — 개인별 프로젝트 경로와 scope 관리 |
| **Override 추적** | `trine-sync-state.json` — 프로젝트별 커스터마이징 자동 감지 |

### Trine이 프로젝트에 배포하는 것

| 카테고리 | 소스 경로 | 프로젝트 배포 경로 | 설명 |
|---------|----------|------------------|------|
| rules | `trine/rules/` | `.claude/rules/` | Claude Code 규칙 (워크플로우, 세션 상태 등) |
| prompts | `trine/prompts/` | `.claude/prompts/` | AI 프롬프트 (파이프라인 등) |
| docs | `trine/docs/` | `docs/trine/` | 아키텍처 문서, 이 가이드 포함 |
| templates | `trine/templates/` | `.specify/templates/` | Spec, Plan, Task, Walkthrough 템플릿 |
| agents | `trine/agents/` | `.claude/agents/` | 커스텀 에이전트 (spec-writer, code-reviewer 등) |
| skills | `trine/skills/` | `.claude/skills/` | 커스텀 스킬 (spec-compliance-checker 등) |
| commands | `trine/commands/` | `.claude/commands/` | 슬래시 커맨드 (/trine, /trine-sync 등) |
| shared-docs | `trine/shared-docs/` | `docs/shared/` | 팀 공유 문서 (모든 프로젝트에 배포) |

---

## 2. 시스템 구조

### 2.1 전체 디렉토리 구조

```
~/.claude/trine/                    ← GitHub private repo (Source of Truth)
├── .gitignore                      ← manifest.json 제외 (개인 경로)
├── README.md                       ← 간략 온보딩 가이드
├── manifest.example.json           ← manifest 템플릿 (플레이스홀더)
├── manifest.json                   ← 개인 설정 (git 추적 안 됨)
│
├── scripts/                        ← 실행 스크립트 (setup이 ~/.claude/scripts/에 복사)
│   ├── trine-sync.mjs              ← 동기화 엔진 v1.2.0
│   ├── session-state.mjs           ← 세션 상태 관리 CLI
│   └── setup.mjs                   ← 부트스트랩 스크립트
│
├── global-rules/                   ← 전역 Claude Code 규칙 (setup이 ~/.claude/rules/에 복사)
│   ├── opus-4-6-best-practices.md  ← 행동/지식/안전성 3축 원칙
│   ├── plan-mode.md                ← Plan mode What vs How 분리
│   └── docs-structure.md           ← docs/ 통일 폴더 구조
│
├── rules/                          ← Trine 규칙 → 프로젝트 .claude/rules/에 배포
│   ├── trine-workflow.md           ← SDD 파이프라인 워크플로우
│   ├── trine-session-state.md      ← 세션 상태 관리 규칙
│   ├── trine-context-engineering.md ← 컨텍스트 엔지니어링
│   ├── trine-requirements-analysis.md ← 요구사항 분석
│   ├── trine-walkthrough.md        ← 구현 워크스루 규칙
│   ├── trine-progress.md           ← 진행 상태 추적
│   └── trine-context-management.md ← 컨텍스트 관리
│
├── prompts/                        ← → 프로젝트 .claude/prompts/에 배포
│   └── trine-pipeline.md           ← SDD 파이프라인 프롬프트
│
├── docs/                           ← → 프로젝트 docs/trine/에 배포
│   ├── trine-architecture.md       ← 아키텍처 설계 문서
│   ├── trine-design-reference.md   ← 설계 레퍼런스
│   ├── trine-execution-plan.md     ← 실행 계획
│   └── trine-team-onboarding-guide.md ← 이 문서
│
├── templates/                      ← → 프로젝트 .specify/templates/에 배포
│   ├── spec-template-base.md       ← Spec 작성 템플릿
│   ├── plan-template-base.md       ← 구현 계획 템플릿
│   ├── task-template-base.md       ← 태스크 분배 템플릿 (Wave 기반)
│   ├── walkthrough-template-base.md ← 구현 워크스루 템플릿
│   ├── progress-template.md        ← 진행 상태 템플릿
│   └── development-plan-template.md ← 개발 계획서 템플릿
│
├── agents/                         ← → 프로젝트 .claude/agents/에 배포
│   ├── spec-writer-base.md         ← Spec 작성 에이전트
│   ├── code-reviewer-base.md       ← 코드 리뷰 에이전트
│   └── trine-pm-updater.md         ← PM 업데이트 에이전트
│
├── skills/                         ← → 프로젝트 .claude/skills/에 배포
│   ├── spec-compliance-checker/    ← Spec 준수 검사
│   └── inspection-checklist/       ← 검수 체크리스트
│
├── commands/                       ← → 프로젝트 .claude/commands/에 배포
│   ├── trine.md                    ← /trine 커맨드
│   ├── trine-sync.md               ← /trine-sync 커맨드
│   ├── trine-status.md             ← /trine-status 커맨드
│   └── trine-resume.md             ← /trine-resume 커맨드
│
├── shared-docs/                    ← → 프로젝트 docs/shared/에 배포 (전 프로젝트)
│   ├── setup-reports/              ← 초기 셋업 리포트
│   └── tech/                       ← 기술 참고 문서
│
└── recommended/                    ← 첫 배포 시만 복사 (이후 스킵)
    ├── prompts/                    ← 추천 프롬프트 (게이트)
    ├── commands/                   ← 추천 커맨드 (보안/UI 체크)
    ├── hooks/                      ← 추천 hooks (세션 컨텍스트 등)
    └── skills/                     ← 추천 스킬 (7개)
```

### 2.2 개인 vs 공유 파일

| 파일 | Git 추적 | 설명 |
|------|:--------:|------|
| `manifest.json` | X | 개인별 워크스페이스 경로 + 등록 프로젝트 |
| `.claude/trine-sync-state.json` | X | 프로젝트별 override 추적 상태 |
| `manifest.example.json` | O | 플레이스홀더 기반 manifest 템플릿 |
| 나머지 전부 | O | 규칙, 템플릿, 스크립트 등 팀 공유 자산 |

### 2.3 setup.mjs가 배포하는 파일 vs trine-sync가 배포하는 파일

| 도구 | 배포 대상 | 배포 위치 | 실행 시점 |
|------|----------|----------|---------|
| `setup.mjs` | scripts (2개) | `~/.claude/scripts/` | clone 직후, 업데이트 시 |
| `setup.mjs` | global-rules (3개) | `~/.claude/rules/` | clone 직후, 업데이트 시 |
| `setup.mjs` | 의존성 (Agent SDK, Agent Teams, tmux) | 설치/확인 | clone 직후, 업데이트 시 |
| `setup.mjs` | manifest.example.json | `manifest.json` 생성 | 최초 1회 (인터랙티브) |
| `trine-sync` | Core (rules, prompts, docs, templates, agents, skills, commands) | 프로젝트 내부 | 동기화 시 |
| `trine-sync` | shared-docs | 프로젝트 `docs/shared/` | 동기화 시 |
| `trine-sync` | recommended | 프로젝트 내부 | 첫 배포 시만 |

---

## 3. 팀원 온보딩 (신규 셋업)

### 3.1 전제조건

| 항목 | 요구사항 | 확인 방법 |
|------|---------|----------|
| Claude Code | CLI 설치 + `~/.claude/` 존재 | `claude --version` |
| Node.js | 18 이상 | `node --version` |
| GitHub SSH | `moongci38-oss/trine` repo 접근 가능 | `ssh -T git@github.com` |

> Agent SDK, tmux는 setup.mjs가 자동으로 설치/확인합니다.

### 3.2 셋업 순서 (2단계)

#### Step 1: Clone

```bash
git clone git@github.com:moongci38-oss/trine.git ~/.claude/trine
```

HTTPS를 사용하는 경우:

```bash
git clone https://github.com/moongci38-oss/trine.git ~/.claude/trine
```

#### Step 2: Setup 실행 (이것만 실행하면 끝)

```bash
node ~/.claude/trine/scripts/setup.mjs
```

`setup.mjs`가 7단계를 자동으로 수행합니다:

```text
========================================
 Trine Setup
========================================

[1/7] Prerequisites
  Node.js: v24.x.x ... OK
  Claude dir: ~/.claude ... OK

[2/7] Install Scripts → ~/.claude/scripts/
  + trine-sync.mjs
  + session-state.mjs

[3/7] Install Rules → ~/.claude/rules/
  + docs-structure.md
  + opus-4-6-best-practices.md
  + plan-mode.md

[4/7] Dependencies
  Agent SDK ... OK (installed)
  Agent Teams ... OK (enabled)
  tmux (WSL) ... OK

[5/7] Configure
  플랫폼: Windows (win32)

  워크스페이스 경로를 입력하세요. (Enter = 건너뛰기)

  WSL 워크스페이스 경로: Z:/home/username/workspace
  Windows 워크스페이스 경로: E:/workspace
  Business 워크스페이스 경로 (선택):

  + manifest.json created

[6/7] Discover & Register

  발견된 프로젝트:
    1. portfolio  → Z:/home/username/workspace/portfolio-project  [all]
    2. godblade   → E:/workspace/god_Sword/src                    [all]

  등록하시겠습니까? (Y/n): Y
  + portfolio registered
  + godblade registered

[7/7] First Sync
  📦 Syncing → portfolio ... ✅ 25 copied
  📦 Syncing → godblade  ... ✅ 25 copied

========================================
 Setup complete!
========================================
```

> **Mac 사용자**: 플랫폼을 자동 감지하여 "프로젝트 워크스페이스 경로" 한 줄만 질문합니다.

### 3.3 자동 설치/확인되는 의존성 (Step 4)

| 항목             | 동작                                                                                      |
|------------------|-------------------------------------------------------------------------------------------|
| **Agent SDK**    | `npm install -g @anthropic-ai/claude-agent-sdk` (미설치 시 자동 설치)                     |
| **Agent Teams**  | `~/.claude/settings.json`에 환경변수 자동 추가 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) |
| **tmux**         | 존재 확인 + 미설치 시 설치 안내 (Mac: `brew install tmux`, Linux: `apt install tmux`)     |

### 3.4 프로젝트 자동 발견 (Step 6)

워크스페이스 경로를 1단계 깊이로 스캔하여 `.claude/` 폴더가 있는 프로젝트를 자동 발견합니다.

- 프로젝트 이름: 디렉토리명에서 자동 생성 (kebab-case)
- Scope: 경로에 `business` 포함 → `shared-only`, 그 외 → `all`
- 이미 등록된 프로젝트는 건너뜀 (멱등성)

자동 발견에 실패한 프로젝트는 수동 등록 가능:

```bash
node ~/.claude/scripts/trine-sync.mjs init /path/to/project \
  --name my-project \
  --scope all \
  --description "프로젝트 설명" \
  --workspace wsl
```

**Scope 옵션:**

| Scope | Core 배포 | Shared Docs 배포 | Recommended 배포 |
|-------|:---------:|:----------------:|:----------------:|
| `all` | O | O | O (옵션) |
| `shared-only` | X | O | X |

비개발 워크스페이스(business 등)는 `shared-only` scope로 등록.

---

## 4. 업데이트

팀 리드가 trine 소스를 변경하여 GitHub에 push한 경우:

```bash
# 1. 최신 소스 받기
cd ~/.claude/trine
git pull

# 2. 스크립트 + 전역 규칙 업데이트
node ~/.claude/trine/scripts/setup.mjs --update

# 3. 프로젝트에 동기화
node ~/.claude/scripts/trine-sync.mjs sync
```

**`--update` 모드 동작:**
- `scripts/` → `~/.claude/scripts/` 덮어쓰기
- `global-rules/` → `~/.claude/rules/` 덮어쓰기
- 의존성 설치/확인 (Agent SDK, Agent Teams, tmux)
- `manifest.json` → 건드리지 않음 (개인 설정 보존)

---

## 5. 주요 명령어 레퍼런스

### 5.1 trine-sync.mjs

```bash
# 전체 프로젝트 동기화
node ~/.claude/scripts/trine-sync.mjs sync

# 특정 프로젝트만 동기화
node ~/.claude/scripts/trine-sync.mjs sync --target my-project

# Recommended 구성 포함 동기화
node ~/.claude/scripts/trine-sync.mjs sync --include-recommended

# 변경 확인만 (실제 복사 안 함)
node ~/.claude/scripts/trine-sync.mjs sync --dry-run

# 상태 확인 (해시 비교)
node ~/.claude/scripts/trine-sync.mjs status

# 조용히 상태 확인 (CI용, exit code만 반환: 0=synced, 2=out-of-sync)
node ~/.claude/scripts/trine-sync.mjs status --quiet

# 차이 비교
node ~/.claude/scripts/trine-sync.mjs diff my-project

# 등록된 프로젝트 목록
node ~/.claude/scripts/trine-sync.mjs list

# 특정 워크스페이스만 필터
node ~/.claude/scripts/trine-sync.mjs list --workspace wsl

# 새 프로젝트 등록
node ~/.claude/scripts/trine-sync.mjs init <path> \
  --name <name> --scope <all|shared-only> \
  --description "설명" --workspace <key>

# 프로젝트 등록 해제
node ~/.claude/scripts/trine-sync.mjs remove <name>
```

### 5.2 session-state.mjs

```bash
# 새 세션 생성
node ~/.claude/scripts/session-state.mjs init --name my-feature --work-size standard

# 세션 목록
node ~/.claude/scripts/session-state.mjs list

# 세션 상태 확인
node ~/.claude/scripts/session-state.mjs status --session my-feature

# 세션 이름 변경 (UUID 불변)
node ~/.claude/scripts/session-state.mjs rename old-name new-name

# 체크포인트 저장
node ~/.claude/scripts/session-state.mjs checkpoint phase2 --session my-feature

# 완료 세션 정리
node ~/.claude/scripts/session-state.mjs clean
```

### 5.3 setup.mjs

```bash
# 초기 셋업 (7단계 전체 실행)
node ~/.claude/trine/scripts/setup.mjs

# 업데이트 (scripts + global-rules + 의존성만, manifest 유지)
node ~/.claude/trine/scripts/setup.mjs --update

# 의존성 설치 건너뛰기
node ~/.claude/trine/scripts/setup.mjs --skip-deps

# 프로젝트 자동 발견 건너뛰기
node ~/.claude/trine/scripts/setup.mjs --skip-discover

# 비대화형 (CI/스크립트)
node ~/.claude/trine/scripts/setup.mjs --workspace ~/projects --business ~/biz   # Mac
node ~/.claude/trine/scripts/setup.mjs --wsl-path "Z:/ws" --win-path "E:/ws"     # Windows
```

---

## 6. Override Tracking (v1.2.0)

### 6.1 개요

templates, agents, skills 3개 카테고리는 **프로젝트별 커스터마이징을 지원**한다.

프로젝트에서 trine이 배포한 파일을 수정하면, 이후 전역 소스가 변경되더라도 프로젝트의 커스텀 버전이 유지된다. 반대로, 수정하지 않은 파일은 전역 변경이 자동으로 반영된다.

### 6.2 동작 방식

```
첫 동기화
  └─ 파일 배포 + 해시 기록 (trine-sync-state.json)

이후 동기화
  ├─ 프로젝트 파일 해시 == 기록된 해시
  │   → 프로젝트가 수정하지 않음 → 전역 변경 자동 반영 (auto)
  │
  └─ 프로젝트 파일 해시 != 기록된 해시
      → 프로젝트가 직접 수정함 → 전역 변경 무시 (project override)
```

### 6.3 출력 예시

```
📦 Syncing → portfolio
  ↻ .specify/templates/spec-template-base.md (auto)
  ⏭ .specify/templates/plan-template-base.md (project override)
  + .claude/rules/trine-new-rule.md
```

| 아이콘 | 의미 |
|--------|------|
| `+` | 신규 파일 배포 |
| `↻` | 변경된 파일 업데이트 |
| `↻ (auto)` | Override 파일 자동 업데이트 (프로젝트 미수정) |
| `⏭ (project override)` | 프로젝트 커스텀 버전 유지 (스킵) |

### 6.4 Override 리셋

프로젝트 커스텀 버전을 버리고 전역 소스로 되돌리려면:

```bash
# 해당 파일 삭제
rm .specify/templates/plan-template-base.md

# 재동기화
node ~/.claude/scripts/trine-sync.mjs sync --target my-project
```

### 6.5 상태 파일

- 각 프로젝트의 `.claude/trine-sync-state.json`에 저장
- `.gitignore`에 이미 추가됨 (개인별 상태, git 추적 안 됨)
- 형식: `{ "version": "1.0.0", "files": { "경로": "해시12자리" } }`

---

## 7. manifest.json 상세

### 7.1 전체 구조

```json
{
  "version": "1.1.0",
  "name": "trine",
  "description": "SDD + DDD + TDD 3축 융합 AI-Native 개발 시스템",
  "workspaces": {
    "wsl": {
      "basePath": "Z:/home/username/workspace",
      "platform": "wsl",
      "description": "Linux/WSL 기반 프로젝트"
    },
    "windows": {
      "basePath": "E:/workspace",
      "platform": "windows",
      "description": "Windows 기반 프로젝트"
    }
  },
  "targets": {
    "my-project": {
      "path": "Z:/home/username/workspace/my-project",
      "description": "Next.js 웹 프로젝트",
      "scope": "all",
      "workspace": "wsl"
    }
  },
  "core": { ... },
  "recommended": { ... },
  "toolchain": { ... },
  "sync": {
    "overridePolicy": "skip",
    "hashAlgorithm": "sha256"
  }
}
```

### 7.2 워크스페이스 설정

워크스페이스는 프로젝트를 논리적으로 그룹화한다.

```json
"workspaces": {
  "wsl": {
    "basePath": "Z:/home/username/workspace",
    "platform": "wsl",
    "description": "Linux/WSL 기반 프로젝트"
  }
}
```

- `basePath`: 워크스페이스 루트 경로 (표시용)
- `platform`: `wsl` 또는 `windows`
- `description`: 설명 텍스트

### 7.3 타겟 등록

`trine-sync init`으로 자동 등록되며, 직접 JSON을 편집해도 된다.

```json
"targets": {
  "my-project": {
    "path": "Z:/home/username/workspace/my-project",
    "description": "프로젝트 설명",
    "scope": "all",
    "workspace": "wsl"
  }
}
```

---

## 8. 전역 규칙 (Global Rules)

`setup.mjs`가 `~/.claude/rules/`에 복사하는 3개 파일. 모든 Claude Code 세션에 적용된다.

| 파일 | 내용 |
|------|------|
| `opus-4-6-best-practices.md` | 행동(적극적) / 지식(신중) / 안전(위험 기반) / 효율 4축 원칙 |
| `plan-mode.md` | Plan mode에서 What만 작성하고 How는 구현 단계에서 처리 |
| `docs-structure.md` | docs/ 통일 폴더 구조 (guides, tech, planning, reviews 등) |

---

## 9. Recommended 구성

첫 동기화 시 `--include-recommended`로 배포. 이후에는 프로젝트에 이미 존재하면 스킵.

### 9.1 Recommended Prompts

| 파일 | 용도 |
|------|------|
| `requirements-analysis.md` | 요구사항 분석 프롬프트 |
| `code-review-gate.md` | 코드 리뷰 게이트 |
| `security-gate.md` | 보안 점검 게이트 |
| `ui-quality-gate.md` | UI 품질 게이트 |
| `resume-session.md` | 세션 재개 프롬프트 |

### 9.2 Recommended Commands

| 파일 | 용도 |
|------|------|
| `trine-check-security.md` | /trine-check-security 보안 점검 |
| `trine-check-ui.md` | /trine-check-ui UI 품질 점검 |
| `trine-generate-image.md` | /trine-generate-image 이미지 생성 |

### 9.3 Recommended Hooks

| 파일 | 용도 |
|------|------|
| `session-context.sh` | 세션 시작 시 trine 컨텍스트 주입 |
| `pre-phase-transition.sh` | 페이즈 전환 전 검증 |
| `subagent-verify.sh` | 서브에이전트 결과 검증 |

### 9.4 Recommended Skills

| 스킬 | 용도 |
|------|------|
| `writing-plans` | 실행 계획 작성 |
| `concise-planning` | 간결한 계획 작성 |
| `kaizen` | 지속적 개선 |
| `frontend-design` | 프론트엔드 UI/UX 디자인 |
| `hook-creator` | Claude Code Hook 생성 |
| `slash-command-creator` | 슬래시 커맨드 생성 |
| `subagent-creator` | 커스텀 에이전트 생성 |

---

## 10. 작업 이력

### 10.1 v1.3.0 변경사항 (2026-02-23)

| 변경 | 설명 |
|------|------|
| 원커맨드 셋업 | setup.mjs 7단계 자동 실행 (clone + setup.mjs 2단계로 온보딩 완료) |
| 의존성 자동 설치 | Agent SDK, Agent Teams 활성화, tmux 확인 |
| 크로스 플랫폼 | Windows + Mac 양쪽 지원 (플랫폼 자동 감지) |
| 프로젝트 자동 발견 | 워크스페이스 스캔 → `.claude/` 프로젝트 자동 등록 |
| 글로벌 스킬 3개 추가 | hook-creator, slash-command-creator, subagent-creator |
| CLI 플래그 확장 | `--skip-deps`, `--skip-discover`, 비대화형 모드 |

### 10.2 v1.2.0 변경사항 (2026-02-23)

| 변경 | 설명 |
|------|------|
| Override 자동 추적 | templates/agents/skills의 프로젝트 수정 여부를 해시로 추적 |
| trine-sync-state.json | 프로젝트별 배포 상태 파일 신규 |
| GitHub private repo | `moongci38-oss/trine`으로 팀 공유 |
| setup.mjs | 팀원 부트스트랩 스크립트 |
| manifest.example.json | 플레이스홀더 기반 manifest 템플릿 |
| global-rules/ | 전역 규칙 3개를 repo에 포함 |
| Wave 기반 병렬 실행 | task/plan 템플릿에 의존성 기반 Wave 분류 추가 |

### 10.2 구현된 파일 목록

| 파일 | 작업 |
|------|------|
| `~/.claude/trine/.gitignore` | 신규 — manifest.json 제외 |
| `~/.claude/trine/manifest.example.json` | 신규 — 플레이스홀더 템플릿 |
| `~/.claude/trine/scripts/trine-sync.mjs` | 복사 — 동기화 엔진 v1.2.0 |
| `~/.claude/trine/scripts/session-state.mjs` | 복사 — 세션 상태 CLI |
| `~/.claude/trine/scripts/setup.mjs` | 신규 — 부트스트랩 스크립트 |
| `~/.claude/trine/global-rules/` | 복사 — 전역 규칙 3개 |
| `~/.claude/trine/README.md` | 신규 — 간략 온보딩 가이드 |
| `~/.claude/trine/docs/trine-team-onboarding-guide.md` | 신규 — 이 문서 |
| `business/.gitignore` | 수정 — trine-sync-state.json 추가 |
| `portfolio-project/.gitignore` | 수정 — trine-sync-state.json 추가 |
| `god_Sword/src/.gitignore` | 수정 — trine-sync-state.json 추가 |

### 10.3 GitHub Repository

- **URL**: `git@github.com:moongci38-oss/trine.git`
- **Visibility**: Private
- **Branch**: master

---

## 11. 트러블슈팅

### 11.1 setup.mjs 에러

| 에러 메시지 | 원인 | 해결 |
|------------|------|------|
| `Node.js 18+ required (current: 16.x)` | Node.js 버전 낮음 | [nodejs.org](https://nodejs.org)에서 LTS 설치. Mac: `brew install node` |
| `~/.claude/ not found` | Claude Code 미설치 | `npm install -g @anthropic-ai/claude-code && claude` |
| `manifest.example.json not found` | repo 불완전 clone | `cd ~/.claude/trine && git pull` 후 재시도 |
| `Agent SDK 설치 실패` | npm 권한 부족 | Mac/Linux: `sudo npm install -g`, Windows: 관리자 터미널 |
| 워크스페이스 경로 존재하지 않음 | 잘못된 경로 입력 | `rm ~/.claude/trine/manifest.json` 후 재실행 |

### 11.2 trine-sync 에러

| 에러/증상 | 원인 | 해결 |
|----------|------|------|
| `target 'xxx' not found in manifest` | manifest.json에 미등록 | `trine-sync init`으로 등록 |
| `path not found: /path/to/project` | 프로젝트 경로 오류 또는 드라이브 미마운트 | manifest.json 경로 확인, WSL 마운트 확인 |
| `workspace 'xxx' not found` | 워크스페이스 키 오타 | `trine-sync list`로 유효 키 확인 |
| `path already registered as 'yyy'` | 같은 경로가 다른 이름으로 등록됨 | `trine-sync remove yyy` 후 재등록 |
| `(project override)` 계속 표시 | 프로젝트에서 파일을 직접 수정 | 의도적이면 무시. 전역 반영 원하면 해당 파일 삭제 후 재동기화 |

### 11.3 Git/SSH 이슈

| 증상 | 원인 | 해결 |
|------|------|------|
| `Repository not found` | SSH 키가 다른 GitHub 계정에 연결 | `ssh -T git@github.com`으로 인증 계정 확인 |
| `Permission denied (publickey)` | SSH 키 미등록 | `ssh-keygen` → GitHub Settings → SSH Keys에 등록 |
| gh CLI와 SSH 계정 불일치 | 별개 인증 시스템 | `gh auth status`로 확인, `gh auth switch --user <name>` |

### 11.4 FAQ

**Q: manifest.json을 실수로 커밋했어요.**
A: `manifest.json`은 `.gitignore`에 있으므로 일반적으로 커밋되지 않습니다. 만약 추적 중이라면:
```bash
git rm --cached manifest.json
git commit -m "chore: remove manifest.json from tracking"
```

**Q: 프로젝트에서 수정한 템플릿을 전역으로 역반영하고 싶어요.**
A: 프로젝트의 수정된 파일을 `~/.claude/trine/templates/`에 복사하고, trine repo에 commit + push하세요.

**Q: 새 워크스페이스를 추가하고 싶어요.**
A: `manifest.json`의 `workspaces` 섹션에 새 키를 추가하세요. 팀 공유 불필요 (manifest는 git 추적 안 됨).

**Q: trine-sync가 배포한 파일인지 내가 만든 파일인지 어떻게 구분해요?**
A: `trine-sync status`로 배포된 파일 목록을 확인하거나, `trine-sync diff <target>`으로 차이를 비교하세요.
