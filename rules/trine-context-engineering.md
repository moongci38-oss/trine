# Context Engineering Rules (ACE-FCA)

> ACE-FCA Intentional Compaction 적용. Skill vs Subagent 기준.

## 핵심 원칙

| ACE-FCA 원칙 | Trine 워크플로우 매핑 |
|-------------|-------------------|
| Research → Plan → Implement | Phase 1.5 → Phase 2 → Phase 3 |
| 컨텍스트 40-60% 유지 | Phase 전환 시 `/compact` 판단 (50% 이상 시 실행) |
| Subagent는 구조화 요약만 반환 | Check 3.6/3.7/3.8 → JSON만 전달 |
| 컨텍스트 품질 실패 → 재시작 | session-state로 중단점 재개 |

## Skill vs Subagent 선택 기준

| 질문 | 결과 |
|------|------|
| 메인 컨텍스트 오염이 큰가? → Yes | **Subagent** (격리) |
| 오염 적음 + 전문 지식 필요? → Yes | **Skill** (전문 지식 주입) |
| 오염 적음 + 전문 지식 불필요 | **직접 실행** (Glob/Grep/Read, 3회 이내) |

## /compact 실행 규칙

| 시점 | 조건 | 행동 |
|------|------|------|
| Phase 전환 | 컨텍스트 50% 이상 | AI 에이전트가 `/compact` 실행 |
| Phase 전환 | 컨텍스트 50% 미만 | 스킵 (불필요한 압축 방지) |
| 자동 수정 3회 초과 | Check 3↔3.5 루프 | `/compact` 후 재시작 |

## History 크기 제한

| 히스토리 | 최근 N개 유지 | 나머지 |
|---------|:-----------:|--------|
| `autoFixHistory` | **5개** | `autoFixArchive` (요약만) |
| `rollbackHistory` | **3개** | `rollbackArchive` |
| `timeoutHistory` | **3개** | `timeoutArchive` |
| `humanOverrides` | **3개** | `overrideArchive` |

아카이브 형식: `{ check, resolved, timestamp }` (상세 필드 제거)

## Subagent 결과 반환 규칙

- **금지**: raw grep/read 출력을 그대로 반환
- **필수**: 구조화 JSON만 반환 (~500 토큰)

```json
{
  "checkId": "check-3.7",
  "status": "FAIL",
  "issues": [
    { "file": "{project-specific-path}", "line": 42, "rule": "violation-id", "severity": "error", "autoFixable": true }
  ],
  "summary": "패턴 위반 N건, 자동 수정 가능 M건",
  "autoFixable": true
}
```

## AI 행동 규칙

1. Phase 전환 시 컨텍스트 사용률 확인 → 50% 이상이면 `/compact` 실행
2. Subagent 스폰 시 반드시 JSON 반환 형식 명시
3. Skill은 전문 지식 주입 용도로만 사용 (대량 탐색 금지)
4. 직접 실행은 Glob/Grep/Read 3회 이내로 제한
