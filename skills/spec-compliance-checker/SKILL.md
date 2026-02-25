# Spec Compliance Checker

Spec 문서와 구현 코드 간의 추적성(Traceability)을 검증하는 전문 스킬.
Trine Check 3.5에서 사용된다.

## 실행 모드

- **Subagent 격리 실행** (Check 3.6/3.7/3.8과 병렬)
- 커맨드: `/trine-check-traceability`
- 읽기 전용 — 코드 수정은 Lead가 수행

## 사용 시점

- Phase 3 구현 완료 후, Check 3 (빌드/테스트) 통과 후 실행
- Spec의 기능 요구사항이 코드와 테스트에 매핑되는지 검증

## 입력 우선순위

1. **Traceability Matrix** (`.specify/traceability/{spec-name}-matrix.json`) — 우선 사용
2. **Spec 파일** (`.specify/specs/{spec-name}.md`) — Matrix 미존재 시 직접 추출
3. **Walkthrough 파일** (`docs/walkthroughs/`) — Files Changed 크로스 체크

## 검증 항목

### 1. Spec → 코드 추적성

Spec 문서의 각 기능 요구사항이 실제 코드에 구현되었는지 확인:

- Traceability Matrix의 `implementationFiles` 경로에서 관련 코드 존재 확인
- Matrix 미존재 시: Spec의 "기능 요구사항" 섹션에서 각 항목 추출 → Grep/Glob 검색
- 매핑되지 않은 요구사항 = **누락** 으로 보고

### 2. Spec → 테스트 추적성

Spec의 각 기능 요구사항에 대응하는 테스트가 존재하는지 확인:

- Traceability Matrix의 `testFiles` 경로에서 관련 테스트 존재 확인
- 테스트 파일에서 관련 describe/it/test 블록 검색
- 커버리지 미달 요구사항 보고

### 3. API 계약 일치

Spec의 API 엔드포인트 정의와 실제 구현이 일치하는지 확인:

- HTTP Method, 경로, 요청/응답 형식
- 인증/인가 요구사항 반영 여부

### 4. 데이터 모델 일치

Spec의 데이터 모델 정의와 실제 Entity/Interface가 일치하는지 확인

## 출력 형식 (JSON, ~500 토큰)

```json
{
  "checkId": "check-3.5",
  "status": "PASS|WARN|FAIL",
  "matrixSource": "traceability-json|spec-extracted",
  "requirements": [
    {
      "id": "FR-001",
      "description": "요구사항 설명",
      "priority": "High|Medium|Low",
      "implStatus": "found|missing",
      "implFile": "path/to/file.ts",
      "testStatus": "found|missing",
      "testFile": "path/to/test.ts",
      "testType": "unit|integration|both",
      "relatedDescribeBlocks": ["describe block name 1", "describe block name 2"]
    }
  ],
  "summary": "전체 N개, 구현 N개 (N%), 테스트 N개 (N%), 누락 N개",
  "autoFixable": false
}
```

> raw grep/read 출력을 그대로 반환하지 않는다. 반드시 구조화 JSON만 반환.

## 판정 기준

| 판정 | 조건 | 행동 |
|------|------|------|
| **PASS** | 모든 필수(High) FR 구현 + 테스트 존재 | 통과 |
| **WARN** | Medium/Low FR 누락 | Lead에게 보고 |
| **FAIL** | High FR 1개+ 누락 | Lead에게 보고 |

## 프로세스

1. `.specify/traceability/` 에서 Matrix JSON 로드 (없으면 Spec에서 직접 추출)
2. 기능 요구사항 목록 확인
3. 각 요구사항의 `implementationFiles` 경로에서 구현 코드 존재 검증
4. 각 요구사항의 `testFiles` 경로에서 테스트 코드 존재 검증
5. API 계약 + 데이터 모델 일치 확인
6. JSON 형식으로 결과 반환
