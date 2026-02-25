# Test Quality Rules

> Check 3.5T — 테스트 품질 검증 게이트.
> 테스트의 **존재**가 아닌 **품질과 포괄성**을 검증한다.

## 적용 조건

- 프로젝트에 `.specify/test-quality-config.json` 존재 시에만 활성화
- 설정 파일 미존재 → Check 3.5T 전체 **SKIP** (비개발 워크스페이스 영향 없음)

## 검증 5축

### T-1: Integration Test 존재 (Critical)

API 변경이 포함된 FR에 대해 Integration Test 파일이 존재해야 한다.

- Check 3.5 출력의 `requirements` 중 API 변경 FR 식별
- 해당 FR의 `testFile`이 설정의 `integrationTestPatterns`에 매칭되는지 확인
- **FAIL**: API 변경 FR 중 Integration Test 1개라도 누락

### T-2: Error Case 포괄 (Critical)

각 FR의 테스트에 Happy Path 외 Error Case(4xx, 예외)가 포함되어야 한다.

- 테스트 파일에서 `describe`/`it`/`test` 블록 분석
- Error Case 패턴 탐지: 4xx 상태코드, `throw`, `reject`, `error`, `invalid`, `fail`, `unauthorized`, `forbidden`, `not found`
- **FAIL**: Error Case가 0개인 FR 존재

### T-3: Spec 테스트 매핑률 (Warning)

Spec 10절(테스트 요구사항)에 명시된 테스트 케이스 대비 실제 구현된 테스트의 매칭률.

- Spec 파일에서 테스트 요구사항 섹션 파싱
- 실제 테스트 파일의 `describe`/`it` 블록과 매칭
- **FAIL**: 매칭률 80% 미만 (임계값은 설정에서 오버라이드 가능)

### T-4: 테스트 격리 (Warning)

테스트가 외부 의존성 없이 독립 실행 가능해야 한다.

- **외부 서비스 직접 호출**: 실제 HTTP 요청, DB 직접 연결 (mock 미사용)
- **전역 상태 변경**: `process.env` 직접 수정, 전역 변수 변경
- **순서 의존**: 다른 테스트의 사이드 이펙트에 의존하는 패턴
- **FAIL**: Critical 패턴 1개 이상 존재

### T-5: 커버리지 임계값 (선택)

프로젝트 설정의 `coverageThreshold`에 정의된 임계값 충족 여부.

- 설정에 `coverageThreshold`가 없으면 SKIP
- 커버리지 데이터가 없으면 SKIP (자동 실행하지 않음)
- **FAIL**: 임계값 미달

## Teammate 행동 규칙

Teammate는 구현 시 아래 테스트 품질 기준을 준수해야 한다:

1. **API 변경 시 Integration Test 필수** — Unit Test만으로 완료 선언 금지
2. **Error Case 포함 필수** — Happy Path만 테스트하고 완료 선언 금지
3. **Spec 10절 테스트 요구사항 반영** — Spec에 명시된 테스트 케이스를 누락하지 않음
4. **테스트 격리 유지** — 외부 서비스 mock 사용, 전역 상태 오염 방지
5. **테스트 파일 네이밍** — 프로젝트 설정의 패턴 규칙 준수

## Lead 검증 규칙

Lead는 Check 3.5T 결과를 기반으로 판단한다:

1. **PASS**: 5축 모두 통과 → 다음 단계 진행
2. **WARN**: T-3 또는 T-4에서 Warning → Lead 판단으로 진행 가능
3. **FAIL**: T-1 또는 T-2에서 Critical 실패 → 자동 수정 또는 [STOP]

## autoFix 규칙

- Check 3 ↔ 3.5 ↔ 3.5T 순환 카운터는 **합산 3회** 제한 (기존 autoFix 카운터 공유)
- T-1/T-2/T-3: 누락 테스트 스켈레톤 자동 생성 가능
- T-4: mock 전환, cleanup 코드 추가 가능
- T-5: 자동 수정 불가 → Lead 판단 ([STOP] 또는 override)
