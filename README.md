# Trine — AI-Native Development System

> SDD + DDD + TDD 3축 융합 개발 워크플로우.
> Claude Code에서 일관된 개발 프로세스를 팀 전체에 적용합니다.

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI 설치
- Node.js 18+
- tmux (Agent Teams 사용 시 필수)

## Quick Start

### 1. Clone

```bash
git clone git@github.com:damools/trine.git ~/.claude/trine
```

### 2. Setup

```bash
node ~/.claude/trine/scripts/setup.mjs
```

이 스크립트가 수행하는 작업:
- `scripts/trine-sync.mjs` → `~/.claude/scripts/` 복사
- `scripts/session-state.mjs` → `~/.claude/scripts/` 복사
- `global-rules/*.md` → `~/.claude/rules/` 복사
- `manifest.example.json` → `manifest.json` 생성 (없는 경우)

### 3. Manifest 설정

`manifest.json`이 생성되면 워크스페이스 경로를 본인 환경에 맞게 수정합니다:

```json
{
  "workspaces": {
    "wsl": {
      "basePath": "/your/wsl/workspace/path"
    },
    "windows": {
      "basePath": "E:/your/windows/workspace"
    }
  }
}
```

### 4. 프로젝트 등록

```bash
node ~/.claude/scripts/trine-sync.mjs init /path/to/project \
  --name my-project \
  --scope all \
  --description "프로젝트 설명" \
  --workspace wsl
```

### 5. 첫 동기화

```bash
node ~/.claude/scripts/trine-sync.mjs sync --target my-project --include-recommended
```

## Updating

팀 리드가 trine 소스를 업데이트한 경우:

```bash
cd ~/.claude/trine
git pull
node ~/.claude/trine/scripts/setup.mjs --update
node ~/.claude/scripts/trine-sync.mjs sync
```

`--update` 플래그는 scripts와 global-rules만 업데이트하고 manifest.json은 건드리지 않습니다.

## Commands

```bash
# 전체 프로젝트 동기화
node ~/.claude/scripts/trine-sync.mjs sync

# 특정 프로젝트만 동기화
node ~/.claude/scripts/trine-sync.mjs sync --target my-project

# Recommended 구성 포함
node ~/.claude/scripts/trine-sync.mjs sync --include-recommended

# 변경 확인 (실제 복사 안 함)
node ~/.claude/scripts/trine-sync.mjs sync --dry-run

# 상태 확인
node ~/.claude/scripts/trine-sync.mjs status

# 차이 비교
node ~/.claude/scripts/trine-sync.mjs diff my-project

# 등록 목록
node ~/.claude/scripts/trine-sync.mjs list
```

## Structure

```
~/.claude/trine/
├── .gitignore              # manifest.json 제외 (개인 경로)
├── README.md               # 이 파일
├── manifest.example.json   # manifest 템플릿 (플레이스홀더)
├── manifest.json           # 개인 설정 (git 추적 안 됨)
├── scripts/
│   ├── trine-sync.mjs      # 동기화 엔진
│   ├── session-state.mjs   # 세션 상태 CLI
│   └── setup.mjs           # 부트스트랩 스크립트
├── global-rules/           # 전역 Claude Code 규칙
│   ├── opus-4-6-best-practices.md
│   ├── plan-mode.md
│   └── docs-structure.md
├── rules/                  # Trine 규칙 (프로젝트에 배포)
├── prompts/                # Trine 프롬프트
├── docs/                   # Trine 아키텍처 문서
├── templates/              # .specify 템플릿
├── agents/                 # 커스텀 에이전트
├── skills/                 # 커스텀 스킬
├── commands/               # 슬래시 커맨드
├── shared-docs/            # 공유 문서 (전 프로젝트 배포)
└── recommended/            # 추천 구성 (첫 배포만)
```

## Override Tracking (v1.2.0)

templates, agents, skills 카테고리는 프로젝트별 커스터마이징을 지원합니다:

- **자동 업데이트**: 프로젝트가 수정하지 않은 파일 → 전역 소스 변경 시 자동 반영
- **프로젝트 오버라이드**: 프로젝트가 직접 수정한 파일 → 전역 변경에도 유지

추적 상태는 각 프로젝트의 `.claude/trine-sync-state.json`에 저장됩니다.

## Scope

| Scope | Core | Shared Docs | Recommended |
|-------|:----:|:-----------:|:-----------:|
| `all` | O | O | O (옵션) |
| `shared-only` | X | O | X |

비개발 워크스페이스(business 등)는 `shared-only` scope로 등록하면 공유 문서만 배포됩니다.
