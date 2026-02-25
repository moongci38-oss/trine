# Trine Workflow Rules

> Trine SDD+DDD+TDD 파이프라인의 핵심 거버넌스 규칙.
> 상세 실행 흐름은 `trine-pipeline.md` 프롬프트에 정의.

## Phase 구조

| Phase | 작업 | 산출물 | Human Gate |
|-------|------|--------|:----------:|
| 1 | 세션 이해 + 작업 규모 분류 | 세션 요약 | **[STOP]** 규모 승인 |
| 1.5 | 요구사항 분석 (Q&A) | 트레이서빌리티 매트릭스 | - |
| 2 | Spec/Plan/Task 작성 | `.specify/specs/`, `.specify/plans/` | **[STOP]** Spec 승인 |
| 3 | 구현 + AI 자동 검증 | 코드 + Walkthrough | - |
| 4 | PR 생성 | PR URL | **[STOP]** Human 검토+Merge |

## 작업 규모 분류

| 분류 | 기준 | Phase 스킵 |
|------|------|-----------|
| **Hotfix** | 긴급 장애, main 기반 | Phase 1.5/2 스킵 가능 |
| **Small** | 단일 파일, 설정 변경 | Phase 1.5 스킵 가능 |
| **Standard** | 일반 기능, 단일 도메인 | 전체 Phase 수행 |
| **Multi-Spec** | 멀티 도메인, 대규모 | 전체 Phase + Plan/Task 필수 |

## Plan/Task 조건부 작성

**Plan.md 필수 조건** (하나 이상 해당 시):
- 멀티 도메인 작업
- 여러 접근 방식 중 선택 필요 (아키텍처 결정)
- 10+ 파일 변경 예상

**Task.md 필수 조건:**
- 3+ 에이전트 동시 작업 필요
- 복잡한 의존성 그래프

## 병렬 실행 의존성 규칙

**의존성 없는 태스크만 동시 스폰한다.**

1. TaskCreate 후 의존성 그래프를 Wave로 분류한다
2. Wave 1: 선행 의존성이 없는 태스크 → 병렬 스폰
3. Wave N: Wave N-1의 모든 선행 태스크가 완료된 후 스폰
4. 같은 Wave 내 태스크만 병렬 실행 가능

```
[의존성 없음] Task A ─┐
[의존성 없음] Task B ─┤ Wave 1 (병렬)
                      │
[A에 의존] Task C ────┤ Wave 2 (A 완료 후)
[B에 의존] Task D ────┘
                      │
[C,D에 의존] Task E ──  Wave 3 (C,D 완료 후)
```

## 검증 체계 (Verification Gates)

| 검증 | 시점 | 실행 | Layer |
|------|------|------|:-----:|
| Check 1-2 | 문서 완료 후 | `verify.sh doc` (프로젝트별) | 1 |
| Check 3 | 구현 완료 후 | `verify.sh code` (프로젝트별) | 1 |
| Check 3.5 | Walkthrough 후 | 트레이서빌리티 검증 | 2 |
| Check 3.5T | Check 3.5 후 | 테스트 품질 (test-quality-checker, 3.5와 순차) | 2 |
| Check 3.6 | Check 3 후 | UI/UX 품질 (Subagent 격리) | 3 |
| Check 3.7 | Check 3 후 | 코드 품질 (Subagent 격리, 3.6과 병렬) | 3 |
| Check 3.7P | Check 3 후 | 성능 품질 (performance-checker, 3.7과 병렬) | 3 |
| Check 3.8 | Check 3 후 | 보안 (Subagent 격리, 3.6/3.7과 병렬) | 3 |
| Check 4 | PR 생성 전 | 커밋/브랜치 규칙 | 1 |
| Check 5 | PR 생성 후 | PR Health (conflict, CI) | 1 |

## 모델 계층화 (Teammate 스폰)

Agent Teams에서 Teammate 스폰 시 작업 성격에 따라 모델을 선택한다.

| 계층 | 모델 | 역할 | 사용 시점 |
|------|------|------|----------|
| Lead | Opus 4.6 | 아키텍처 판단, 종합, 오케스트레이션 | 항상 |
| 구현 Teammate | Sonnet 4.6 | 코딩, 테스트, 문서 작성 | 코드 변경이 필요한 Task |
| 탐색 Teammate | Haiku 4.5 | 파일 탐색, 패턴 확인, 코드 검색 | 정보 수집만 필요한 Task |

### Haiku 탐색 Teammate 활용 기준

Haiku 4.5를 탐색 Teammate로 스폰하는 경우:

- **파일 패턴 조사**: 프로젝트 내 기존 코드 패턴 파악 (예: "기존 DTO 데코레이터 패턴 확인")
- **의존성 매핑**: 모듈 간 import 관계 조사
- **코드 검색**: 특정 함수/클래스의 사용처 전수 조사
- **설정 확인**: 기존 설정 파일 값 수집

Haiku를 사용하지 않는 경우:
- 코드 수정/생성이 필요한 작업 → Sonnet 사용
- 아키텍처 판단이 필요한 작업 → Lead 직접 수행
- 보안/품질 검증 → 전용 Check Subagent 사용

### 스폰 예시

```
# 탐색 Teammate (Haiku) — 정보 수집만
Task(model: "haiku", prompt: "apps/api/src/modules/ 내 모든 Entity의 @Index() 데코레이터 사용 현황 조사")

# 구현 Teammate (Sonnet) — 코드 변경
Task(model: "sonnet", prompt: "estimates 모듈의 Service/Controller 구현")
```

## Auto-Fix 규칙

- Check 실패 시 자동 수정 → 재실행 (최대 **3회**)
- 3회 초과 → **[STOP]** Human 개입 필수
- autoFix 카운터는 세션 재개 시 리셋 금지 (Write-Ahead)
- Check 3 ↔ 3.5 ↔ 3.5T 순환 **합산** 최대 3회 — 조기 탈출: 2회차 동일 패턴 시 즉시 중단

## PR 역할 분리

| 역할 | AI | Human |
|------|:--:|:-----:|
| 브랜치 생성 | O | - |
| 코드 구현 | O | - |
| PR 생성 + 본문 | O | - |
| PR 검토 | - | **O** |
| PR Merge | - | **O** |
