# Trine — AI-Native Development System

> SDD + DDD + TDD 3축 융합 개발 워크플로우.
> Claude Code에서 일관된 개발 프로세스를 팀 전체에 적용합니다.

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) CLI 설치
- Node.js 18+
- tmux (Agent Teams 사용 시 필수 — setup.mjs가 자동 확인)

## Quick Start

```bash
# 1. Clone
git clone git@github.com:moongci38-oss/trine.git ~/.claude/trine

# 2. Setup (이것만 실행하면 끝)
node ~/.claude/trine/scripts/setup.mjs
```

> **Windows PowerShell 사용자**: PowerShell에서 `~`가 확장되지 않아 잘못된 위치에 clone될 수 있습니다.
> `$HOME`을 사용하세요:
>
> ```powershell
> git clone git@github.com:moongci38-oss/trine.git "$HOME\.claude\trine"
> node "$HOME\.claude\trine\scripts\setup.mjs"
> ```

setup.mjs가 자동으로 수행하는 작업:

1. 스크립트 설치 (`trine-sync.mjs`, `session-state.mjs` → `~/.claude/scripts/`)
2. 전역 컴포넌트 설치 (rules, agents, skills, commands, prompts + recommended → `~/.claude/`)
3. 의존성 설치 (Agent SDK, Agent Teams 활성화, tmux 확인)
4. 플랫폼 감지 (Windows/Mac) → 워크스페이스 경로 질문 → `manifest.json` 생성
5. 워크스페이스 내 프로젝트 자동 발견 + 등록
6. 첫 동기화 실행 (templates → 프로젝트)

## Updating

팀원이 trine 소스를 업데이트한 경우:

```bash
cd ~/.claude/trine && git pull
node ~/.claude/trine/scripts/setup.mjs --update
node ~/.claude/scripts/trine-sync.mjs sync
```

`--update`는 scripts, 전역 컴포넌트(rules/agents/skills/commands/prompts), 의존성을 갱신합니다 (manifest.json 유지).

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

```text
~/.claude/trine/                    # Source of Truth
├── scripts/                        # 스크립트 (setup, sync, session)
├── global-rules/                   # 전역 규칙 → ~/.claude/rules/
├── rules/                          # Trine 규칙 → ~/.claude/rules/
├── agents/                         # 에이전트 → ~/.claude/agents/
├── skills/                         # 스킬 → ~/.claude/skills/
├── commands/                       # 커맨드 → ~/.claude/commands/
├── prompts/                        # 프롬프트 → ~/.claude/prompts/
├── templates/                      # 템플릿 → 프로젝트 .specify/templates/
├── github-spec-kit/                # GitHub Spec Kit → 프로젝트 .github/ + scripts/
│   ├── workflows/                  #   spec-check.yml, spec-change-detector.yml
│   ├── issue-templates/            #   spec-request.md, bug-report.md
│   ├── pr-template/                #   pull_request_template.md
│   └── scripts/                    #   validate-spec.js
├── docs/                           # 아키텍처 문서 (직접 참조)
├── shared-docs/                    # 공유 기술 문서 (직접 참조)
├── recommended/                    # 추천 구성 → ~/.claude/ (기존 파일 스킵)
├── manifest.example.json           # manifest 템플릿
└── manifest.json                   # 개인 설정 (git 추적 안 됨)
```

> v1.5.0: GitHub Spec Kit (workflows, templates, scripts)을 프로젝트에 배포.
> v1.4.0: 대부분의 파일을 `~/.claude/`에 전역 배포. 프로젝트에는 templates만 배포.

## Override Tracking (v1.5.0)

templates와 github-spec-kit이 프로젝트별 커스터마이징을 지원합니다:

- **자동 업데이트**: 프로젝트가 수정하지 않은 파일 → 전역 변경 시 자동 반영
- **프로젝트 오버라이드**: 프로젝트가 직접 수정한 파일 → 전역 변경에도 유지

> agents, skills, commands, prompts는 v1.4.0부터 전역 배포 (override tracking 불필요).

## Scope

| Scope | 전역 컴포넌트 | Templates | GitHub Spec Kit | Hooks |
|-------|:----------:|:---------:|:--------------:|:-----:|
| `all` | 자동 | O | O | O (옵션) |
| `shared-only` | 자동 | X | X | X |

전역 컴포넌트는 scope 무관 — 모든 프로젝트에서 자동 로드됩니다.

## Troubleshooting

### git clone 실패

```
Permission denied (publickey)
```

SSH key가 GitHub에 등록되지 않았습니다:

```bash
# SSH key 생성 (없는 경우)
ssh-keygen -t ed25519 -C "your-email@example.com"

# 공개키 복사 → GitHub Settings > SSH Keys에 추가
cat ~/.ssh/id_ed25519.pub

# 또는 HTTPS로 clone
git clone https://github.com/moongci38-oss/trine.git ~/.claude/trine
```

### Node.js 18+ 미설치

```
ERROR: Node.js 18+ required (current: 16.x.x)
```

[nodejs.org](https://nodejs.org)에서 LTS 버전 설치. Mac은 `brew install node`도 가능.

### Claude Code 미설치 (~/.claude/ 없음)

```
ERROR: ~/.claude/ not found.
```

```bash
npm install -g @anthropic-ai/claude-code
claude  # 최초 실행 시 ~/.claude/ 자동 생성
```

### Agent SDK 설치 실패

```text
npm install -g @anthropic-ai/claude-agent-sdk
```

권한 문제인 경우 `sudo` (Mac/Linux) 또는 관리자 터미널 (Windows)로 실행.

### 워크스페이스 경로 오류

setup.mjs에서 잘못된 경로를 입력한 경우:

```bash
# manifest.json 삭제 후 재실행
rm ~/.claude/trine/manifest.json
node ~/.claude/trine/scripts/setup.mjs
```

### 프로젝트가 자동 발견되지 않음

`.claude/` 폴더가 있는 프로젝트만 자동 발견됩니다. 수동 등록:

```bash
node ~/.claude/scripts/trine-sync.mjs init /path/to/project --name my-project
```

### Sync 실패

```bash
# 상태 확인
node ~/.claude/scripts/trine-sync.mjs status

# 특정 프로젝트 차이 확인
node ~/.claude/scripts/trine-sync.mjs diff my-project

# 프로젝트 경로가 바뀐 경우 → 제거 후 재등록
node ~/.claude/scripts/trine-sync.mjs remove my-project
node ~/.claude/scripts/trine-sync.mjs init /new/path --name my-project
```

### Windows: WSL 관련

Windows에서 WSL 경로를 사용하려면 WSL이 설치되어 있어야 합니다:

```bash
# WSL 설치 확인
wsl --list

# WSL 미설치 시 → WSL 경로는 Enter로 건너뛰고 Windows 경로만 사용
```

### 재설정 (처음부터 다시)

```bash
# 1. manifest + sync 상태 초기화
rm ~/.claude/trine/manifest.json

# 2. 재실행
node ~/.claude/trine/scripts/setup.mjs
```
