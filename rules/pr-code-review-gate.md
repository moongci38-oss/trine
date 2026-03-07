# PR Code Review Gate (전역)

> PR 생성 전후 코드 리뷰 워닝을 사전 차단하고, 생성 후 자동 대응하는 규칙.

## 핵심 원칙

**PR을 생성하기 전에 자체 코드 리뷰를 수행한다. PR 생성 후 봇/Human 리뷰 코멘트는 반드시 수정한다.**

## PR 생성 전 자체 검증 (Pre-PR Review)

PR 생성 직전, 변경된 파일에 대해 아래 항목을 검증한다:

### 보안 (Blocking — 발견 시 PR 생성 중단)

| 패턴 | 설명 | 수정 방법 |
|------|------|----------|
| `canActivate() return true` | Stub Guard — 인증 우회 | 실제 JWT/RBAC Guard 구현 |
| Script 태그 내 `${}` 보간 | XSS 위험 | `JSON.stringify()` 사용 |
| 프로덕션 코드에 하드코딩 시크릿 | 시크릿 노출 | 환경변수/ConfigService |

### 품질 (Warning — 수정 권장)

| 패턴 | 설명 | 수정 방법 |
|------|------|----------|
| 프로덕션 코드에 하드코딩 UUID | 설정값 하드코딩 | Config/Auth context |
| `expiresIn: '15m'` 등 매직 넘버 | 설정 하드코딩 | ConfigService |
| `any` 타입 3개 초과 | 타입 안전성 부족 | 적절한 인터페이스 정의 |
| bcrypt + bcryptjs 혼용 | 의존성 불일치 | 하나로 통일 |
| `TODO/FIXME/HACK` 잔존 | 미완성 코드 | 수정 또는 이슈 등록 |
| useCallback 의존성 누락 | React 렌더링 버그 | deps 배열 검토 |

## PR 생성 후 리뷰 대응 (AI Check 5)

PR 생성 후 반드시 수행:

```
1. 60초 대기 → gh pr checks {PR} → CI 확인
2. gh api repos/{owner}/{repo}/pulls/{PR}/reviews → 리뷰 본문 확인
3. gh api repos/{owner}/{repo}/pulls/{PR}/comments → 인라인 코멘트 확인
4. WARN/BLOCK 코멘트 → 코드 수정 → 새 커밋 push
5. 각 코멘트에 "Fixed in {hash} — {요약}" 회신
6. CI 재확인 → 전부 PASS 될 때까지 반복
```

## AI 행동 규칙

1. `gh pr create` 실행 전 위 보안 패턴을 자체 검증
2. Blocking 이슈 발견 시 PR 생성하지 않고 수정 먼저
3. PR 생성 후 CI + 리뷰 코멘트 확인을 **스킵하지 않는다**
4. 봇 리뷰(Gemini 등)도 Human 리뷰와 동일하게 대응
5. PR URL 반환 후 "완료" 선언 금지 — CI + 리뷰 처리 완료 후에만
6. 워크트리 에이전트에도 동일 규칙 프롬프트에 포함

---

*Last Updated: 2026-03-05*
