# Trine — AI-Native Development System

> SDD + DDD + TDD 3축 융합 개발 워크플로우.
> Claude Code에서 일관된 개발 프로세스를 팀 전체에 적용합니다.

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI 설치
- Node.js 18+
- tmux (Agent Teams 사용 시 필수)

## Quick Start

```bash
# 1. Clone
git clone git@github.com:moongci38-oss/trine.git ~/.claude/trine

# 2. Setup (이것만 실행하면 끝)
node ~/.claude/trine/scripts/setup.mjs
```

setup.mjs가 자동으로 수행하는 작업:

1. 스크립트 설치 (`trine-sync.mjs`, `session-state.mjs` → `~/.claude/scripts/`)
2. 전역 규칙 설치 (`global-rules/*.md` → `~/.claude/rules/`)
3. 플랫폼 감지 (Windows/Mac) → 워크스페이스 경로 질문 → `manifest.json` 생성
4. 워크스페이스 내 프로젝트 자동 발견 + 등록
5. 첫 동기화 실행 (`--include-recommended`)

## Updating

팀원이 trine 소스를 업데이트한 경우:

```bash
cd ~/.claude/trine && git pull
node ~/.claude/trine/scripts/setup.mjs --update
node ~/.claude/scripts/trine-sync.mjs sync
```

`--update`는 scripts와 global-rules만 갱신합니다 (manifest.json 유지).

## Contributing

trine 시스템 수정/고도화:

```bash
# 1. 수정 (rules, agents, skills, templates 등)
cd ~/.claude/trine
# ... 파일 편집 ...

# 2. 커밋 & 푸시
git add -A && git commit -m "feat: 새 규칙 추가" && git push

# 3. 다른 팀원 업데이트
cd ~/.claude/trine && git pull
node ~/.claude/trine/scripts/setup.mjs --update
```

## Commands

```bash
# 동기화
node ~/.claude/scripts/trine-sync.mjs sync
node ~/.claude/scripts/trine-sync.mjs sync --target my-project
node ~/.claude/scripts/trine-sync.mjs sync --include-recommended

# 상태 확인
node ~/.claude/scripts/trine-sync.mjs status
node ~/.claude/scripts/trine-sync.mjs diff my-project
node ~/.claude/scripts/trine-sync.mjs list

# 프로젝트 관리
node ~/.claude/scripts/trine-sync.mjs init /path --name my-project
node ~/.claude/scripts/trine-sync.mjs remove my-project
```

## Cross-Platform

| 플랫폼 | 워크스페이스 | 비고 |
|--------|------------|------|
| **Windows** | WSL + Windows | WSL/Windows 각각 경로 입력 |
| **macOS** | 프로젝트 경로 1개 | 단일 워크스페이스 |

setup.mjs가 `process.platform`으로 자동 감지하여 해당 플랫폼 질문만 표시합니다.

## Structure

```
~/.claude/trine/
├── scripts/                # 스크립트 (setup, sync, session)
├── global-rules/           # 전역 Claude Code 규칙
├── rules/                  # Trine 규칙 (프로젝트 배포)
├── prompts/                # Trine 프롬프트
├── docs/                   # 아키텍처 문서
├── templates/              # .specify 템플릿
├── agents/                 # 커스텀 에이전트
├── skills/                 # 커스텀 스킬
├── commands/               # 슬래시 커맨드
├── shared-docs/            # 공유 문서 (전 프로젝트 배포)
├── recommended/            # 추천 구성 (첫 배포만)
├── manifest.example.json   # manifest 템플릿
└── manifest.json           # 개인 설정 (git 추적 안 됨)
```

## Override Tracking (v1.2.0)

templates, agents, skills는 프로젝트별 커스터마이징을 지원합니다:

- **자동 업데이트**: 프로젝트가 수정하지 않은 파일 → 전역 변경 시 자동 반영
- **프로젝트 오버라이드**: 프로젝트가 직접 수정한 파일 → 전역 변경에도 유지

## Scope

| Scope | Core | Shared Docs | Recommended |
|-------|:----:|:-----------:|:-----------:|
| `all` | O | O | O (옵션) |
| `shared-only` | X | O | X |

비개발 워크스페이스(business 등)는 `shared-only` scope로 등록하면 공유 문서만 배포됩니다.
