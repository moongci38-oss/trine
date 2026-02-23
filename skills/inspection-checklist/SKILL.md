# Inspection Checklist

Trine 파이프라인의 모든 Check를 통합한 최종 검수 체크리스트를 생성하는 스킬.
PR 생성 전(Phase 4 직전) 또는 릴리즈 전 최종 점검에 사용된다.

## 사용 시점

- Phase 3의 모든 Check (3, 3.5, 3.6, 3.7, 3.8) 완료 후
- Phase 4 PR 생성 직전 최종 검수
- 릴리즈 전 종합 점검

## 체크리스트 항목

### 1. 빌드/테스트 (Check 3)

- [ ] `verify.sh code` 통과 (빌드 성공)
- [ ] `verify.sh test` 통과 (전체 테스트 PASS)
- [ ] `verify.sh lint` 통과 (코드 스타일)
- [ ] 타입 체크 통과
- [ ] 신규 경고 없음

### 2. Spec 추적성 (Check 3.5)

- [ ] 모든 기능 요구사항 구현됨
- [ ] 모든 기능 요구사항에 테스트 존재
- [ ] API 계약 일치 (Method, 경로, 요청/응답)
- [ ] 데이터 모델 일치

### 3. UI/품질 (Check 3.6) — Frontend 변경 시

- [ ] 반응형 디자인 확인 (mobile/tablet/desktop)
- [ ] 접근성 (WCAG 2.1 AA) 기준 충족
- [ ] Lighthouse 성능 점수 ≥ 90
- [ ] 이미지 최적화 (WebP/AVIF, lazy loading)
- [ ] 크로스 브라우저 호환성

### 4. 코드 리뷰 (Check 3.7)

- [ ] SOLID 원칙 준수
- [ ] 코드 중복 없음 (DRY)
- [ ] 함수 복잡도 ≤ 10 (Cyclomatic)
- [ ] 네이밍 컨벤션 일관성
- [ ] 에러 핸들링 적절
- [ ] 테스트 코드 품질

### 5. 보안 (Check 3.8)

- [ ] 입력 검증 (SQL Injection, XSS 방지)
- [ ] 인증/인가 로직 검증
- [ ] 민감 데이터 노출 없음
- [ ] 의존성 취약점 없음
- [ ] CORS/CSP 설정 적절

### 6. 문서/PR 준비

- [ ] Spec 파일 최신 상태
- [ ] 변경 사항 요약 작성
- [ ] Breaking Change 있으면 마이그레이션 가이드
- [ ] 커밋 메시지 Conventional Commits 준수

## 출력 형식

```markdown
# 통합 검수 체크리스트

## 프로젝트: {project}
## 세션: {session}
## 날짜: {date}

### 결과 요약

| 영역 | 상태 | 비고 |
|------|:----:|------|
| 빌드/테스트 | ✅ | 전체 PASS |
| Spec 추적성 | ✅ | 100% 매핑 |
| UI/품질 | ⬜ | N/A (백엔드만) |
| 코드 리뷰 | ✅ | 이슈 0건 |
| 보안 | ✅ | 취약점 없음 |

### 최종 판정: ✅ PR 생성 가능 / ❌ 수정 필요
```

## 프로세스

1. 현재 세션의 Check 결과 수집 (session-state.mjs에서 읽기)
2. 각 Check 영역별 상세 항목 검증
3. Frontend 변경 없으면 Check 3.6은 N/A 처리
4. 체크리스트 생성 + 최종 판정
5. 결과를 세션 상태에 기록
