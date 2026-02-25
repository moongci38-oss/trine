# Progress Auto-Management Rules

## 개요

AI 에이전트(`trine-pm-updater`)가 Phase 전환 시 PM 문서(progress.md, development-plan.md)의 진행상태를 갱신한다.

> **실행 주체**: `trine-pm-updater` 에이전트 (Haiku). Git Hook이 아닌, AI 에이전트가 Phase 전환/세션 이벤트 시 호출된다.
>
> **한계**: 현재 자동 호출 경로(Hook, session-state.mjs 연동)가 구현되어 있지 않다. AI가 Trine 파이프라인을 실행하는 동안 Phase 전환 시점에 `trine-pm-updater`를 서브에이전트로 스폰해야 한다. 스폰하지 못하는 경우 **Human이 수동으로 PM 문서를 갱신**해야 한다.

## 상태 전환

```
⬜ pending → 🔄 in-progress → ✅ completed
              ↖── 재작업 시 ──↙
```

## AI 에이전트 트리거

아래는 Git Hook이 아니라, **AI 에이전트가 Phase 전환 시 수행하는 행동 규칙**이다.

| 이벤트 | AI 에이전트 행동 | 상태 변경 |
|--------|----------------|----------|
| 브랜치 생성 (`feat/xxx`) | `trine-pm-updater` 스폰 → 매핑 조회 → 문서 갱신 | 관련 항목 → 🔄 in-progress |
| PR merge to develop | `trine-pm-updater` 스폰 → 매핑 조회 → 문서 갱신 | 관련 항목 → ✅ completed |
| 재작업 (같은 브랜치 재생성) | `trine-pm-updater` 스폰 → 매핑 조회 → 문서 갱신 | 관련 항목 → 🔄 in-progress |

> **수동 Fallback**: Trine 파이프라인 밖에서 브랜치를 생성하거나 PR을 merge한 경우, AI 에이전트가 트리거되지 않는다. Human이 직접 progress.md의 체크박스/상태를 변경해야 한다.

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

매핑은 두 곳에서 AI가 자동 생성한다:

1. **Phase 2 문서 작성 시**: Spec 초기화 시 계획서를 스캔하여 매핑 자동 생성
2. **fallback**: 매핑이 없을 때 계획서에서 키워드 매칭으로 자동 생성

### 자동 감지 실패 시 수동 매핑 가이드

**[STOP] Human 개입 필요** — 아래 징후가 나타나면 자동 감지가 실패한 것이다:

#### 실패 징후 체크리스트

- [ ] AI가 "매핑을 찾을 수 없습니다"라고 보고함
- [ ] Phase 전환 후 progress.md가 갱신되지 않음
- [ ] 브랜치명이 계획서의 어떤 항목과도 키워드 매칭되지 않음
- [ ] 계획서가 비표준 형식이거나 항목 번호가 없음
- [ ] progress-mapping.json 파일 자체가 프로젝트에 존재하지 않음

#### 수동 매핑 방법

1. 프로젝트의 `.claude/progress-mapping.json` 파일을 열거나 생성한다
2. 아래 JSON 스키마에 따라 브랜치명을 키로 매핑을 추가한다
3. 저장 후 다음 Phase 전환부터 AI 에이전트가 매핑을 참조한다

#### 매핑 JSON 스키마

```json
{
  "<branch-name>": {
    "phase": <number>,
    "description": "<작업 설명>",
    "items": {
      "progress.md": ["<항목번호>", ...],
      "상세계획서": ["<항목번호>", ...]
    }
  }
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `<branch-name>` (키) | string | Git 브랜치명에서 prefix 제거 (예: `feat/auth-login` → `auth-login`) |
| `phase` | number | 해당 작업이 속한 Phase 번호 |
| `description` | string | 작업 설명 (자동 생성 시 계획서에서 추출) |
| `items.progress.md` | string[] | progress.md에서 갱신할 항목 번호 목록 |
| `items.상세계획서` | string[] | 상세계획서에서 갱신할 항목 번호 목록 |

#### 실제 예시 (Portfolio 프로젝트)

```json
{
  "ai-chatbot": {
    "phase": 3,
    "description": "Phase 3.1 - AI Chatbot MVP (Claude API + WebSocket + Chat UI)",
    "items": {
      "progress.md": ["3.1.1", "3.1.2", "3.1.3", "3.1.4"],
      "상세계획서": ["3.1.1", "3.1.2", "3.1.3", "3.1.4"]
    }
  },
  "project-showcase": {
    "phase": 4,
    "description": "Phase 4.2 - Project Showcase (목록/상세/갤러리/조회수 트래킹)",
    "items": {
      "progress.md": ["4.2.1", "4.2.2", "4.2.3", "4.2.4", "4.2.5"],
      "상세계획서": ["4.2.1", "4.2.2", "4.2.3", "4.2.4", "4.2.5"]
    }
  }
}
```

> **참고**: `items`의 키 이름(`progress.md`, `상세계획서`)은 프로젝트마다 다를 수 있다. 실제 PM 문서 파일명에 맞춰 지정한다.

## PM 문서 자동 갱신

`trine-pm-updater` 에이전트가 Phase 전환 시 PM 문서를 갱신한다:

| 이벤트 | progress.md | development-plan.md |
|--------|:-----------:|:-------------------:|
| 세션 시작 (init) | - | 새 세션 항목 추가 |
| Phase 전환 (checkpoint) | 체크박스 완료 변경 | Phase 상태 업데이트 |
| Check 결과 | 결과 기록 | - |
| 세션 완료 (complete) | PR 번호 기록 | 완료 상태 + 소요 시간 |

## 외부 PM 도구 연동

### Source of Truth

**로컬 `progress.md`가 유일한 Source of Truth**이다. 외부 도구는 읽기/반영 대상이지, 역방향으로 로컬 문서를 덮어쓰지 않는다.

```
progress.md (Source of Truth) ──push──→ Notion DB / Jira / etc.
                               ←read── (참조만, 역동기화 금지)
```

### Notion MCP (현재 활성)

Notion MCP가 연결되어 있으므로 진행상태를 Notion DB에 반영할 수 있다.

**권장 패턴**:

1. Notion에 프로젝트 진행상태 DB 생성 (Status, Phase, PR 컬럼)
2. `trine-pm-updater`가 progress.md 갱신 후 → Notion DB에도 동일 상태 push
3. Notion은 팀/이해관계자 공유 대시보드 용도로만 사용

**AI 행동**:
- Notion DB 업데이트 시 `mcp__*_notion__notion-update-page` 사용
- Notion → progress.md 역동기화는 수행하지 않음

### 기타 도구 (향후 MCP 확장 시)

| 도구 | MCP 추가 시 연동 방법 | 현재 상태 |
|------|---------------------|----------|
| **Jira** | Jira MCP → 이슈 상태 동기화 | 미연동 |
| **Linear** | Linear MCP → 이슈 상태 동기화 | 미연동 |
| **Trello** | Trello MCP → 카드 상태 동기화 | 미연동 |
| **Slack** | Slack MCP → Phase 전환 알림 전송 | 미연동 |

> 새 MCP 연동 시에도 Source of Truth 원칙은 동일하게 적용한다. progress.md → 외부 도구 단방향 push만 허용.

### 양방향 동기화 금지 사유

- 외부 도구에서 상태를 변경하면 progress.md와 불일치 발생
- 충돌 해소 로직이 없으므로 데이터 손실 위험
- Git 이력으로 추적 가능한 로컬 파일이 가장 신뢰할 수 있는 소스

## AI 에이전트 행동 규칙

1. **브랜치 생성 직후**: `trine-pm-updater` 스폰 → 진행 상태 업데이트
2. **PR 생성 전**: 문서 상태 확인 (progress.md의 체크박스가 현재 Phase까지 완료되었는지)
3. **PR merge 후**: `trine-pm-updater` 스폰 → 완료 상태 업데이트
4. **재작업 시**: `trine-pm-updater` 스폰 → in-progress로 복귀
5. **매핑 자동 감지 실패 시**: **[STOP]** Human에게 "progress-mapping.json에 수동 매핑이 필요합니다"라고 알리고, 위의 수동 매핑 가이드를 안내한다. 매핑 없이 progress.md를 추측으로 갱신하지 않는다.
6. **외부 PM 도구 연동 시**: progress.md 갱신 완료 후에만 외부 도구에 push한다. 외부 도구 갱신 실패는 경고만 출력하고 파이프라인을 중단하지 않는다.
