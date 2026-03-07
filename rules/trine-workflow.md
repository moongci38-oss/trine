---
title: "Trine 워크플로우 규칙"
id: trine-workflow
impact: HIGH
scope: [trine]
tags: [pipeline, phase, verification, auto-fix, implicit-entry]
requires: []
section: trine-core
audience: dev
impactDescription: "미준수 시 Phase 게이트 누락 → 검증 없는 코드가 PR로 진행, Auto-Fix 무한 루프, 규모 분류 오류로 불필요한 프로세스 수행"
enforcement: rigid
---

# Trine Workflow Rules

> Trine SDD+DDD+TDD 파이프라인의 핵심 거버넌스 규칙.
> **운영 모델**: AI가 규칙을 참조하며 Phase를 수동 실행하고, Human이 게이트에서 승인한다.
> 상세 실행 흐름은 `trine-pipeline.md` 프롬프트에 정의.

## Phase 구조

| Phase | 작업 | 산출물 | Human Gate |
|-------|------|--------|:----------:|
| 1 | 세션 이해 + 작업 규모 분류 | 세션 요약 | Standard: **[STOP]** / Hotfix: 묵시적 |
| 1.5 | 요구사항 분석 (Q&A) | 트레이서빌리티 매트릭스 | - |
| 2 | Spec/Plan/Task 작성 | `.specify/specs/`, `.specify/plans/` | **[STOP]** Spec 승인 |
| 3 | 구현 + AI 자동 검증 | 코드 + Walkthrough | - |
| 4 | PR 생성 | PR URL | **[STOP]** Human 검토+Merge |

## Implicit Entry (기본 개발 방법론)

개발 프로젝트에서 코드 변경 요청이 오면, `/trine` 커맨드 없이도 Trine이 **기본 개발 방법론**으로 자동 적용된다.

### 3-Signal Detection

아래 3개 신호가 **모두 충족**되면 Trine을 자동 적용한다:

| # | Signal | 판별 기준 |
|:-:|--------|----------|
| 1 | **프로젝트 컨텍스트** | `.specify/` 디렉토리 존재 (Trine 설정이 있는 개발 프로젝트) |
| 2 | **코드 변경 의도** | 요청이 코드 수정/추가/삭제를 필요로 함 |
| 3 | **비제외 대상** | 아래 제외 목록에 해당하지 않음 |

### 제외 대상 (Trine 미적용)

- 코드 설명/분석만 요청 (구현 변경 없음)
- 문서(docs/, README)만 수정
- 파일 탐색/검색/코드 리뷰만 요청
- Business 워크스페이스 비개발 작업 (리서치, 마케팅, 콘텐츠)

### Implicit vs Explicit 비교

| 항목 | Implicit (자동 진입) | Explicit (`/trine session-name`) |
|------|---------------------|----------------------------------|
| 세션 이름 | 요청에서 자동 생성 | Human 지정 |
| 규모 분류 | AI 자동 판단 (Heuristic) | AI 제안 → **[STOP]** Human 승인 |
| SIGIL 산출물 | 없음 (기획서 없이 진입) | S4 기획 패키지 참조 |
| 합류 시점 | 규모 분류 후 동일 파이프라인 | Phase 1부터 동일 파이프라인 |

### 자동 규모 분류 Heuristic

AI가 요청 내용에서 아래 기준으로 규모를 자동 판단한다:

| 분류 | Heuristic | 예시 |
|------|-----------|------|
| **Hotfix** | "긴급/장애/프로덕션 에러" 키워드, main 브랜치 수정, 단일 파일 | "로그인 500 에러 긴급 수정" |
| **Standard** | 새 기능, API 구현, 컴포넌트 생성, 리팩토링, 테스트 추가 | "채팅 기능 추가해줘" |

### Hotfix 경량 프로세스

```
Hotfix:  Phase 1(경량) → Phase 3 → Check 3 → Phase 4
```

- Phase 1(경량): 규모 분류만 수행, codebase-analyzer 스킵
- Phase 1.5/2: 스킵
- Check 3.5/3.7: 스킵

### 규모 재분류 (Escalation)

| 징후 | 행동 |
|------|------|
| Hotfix에서 복잡도 발견 (변경 파일 2+ 또는 테스트 필요) | **[STOP]** Standard로 재분류 제안 |
| Spec 없이 구현이 모호해짐 | **[STOP]** Phase 2(Spec 작성)로 전환 제안 |

재분류 시 이미 완료된 Phase는 재실행하지 않고, 필요한 Phase부터 이어서 진행한다.

## 작업 규모 분류

| 분류 | 기준 | Phase 스킵 |
|------|------|-----------|
| **Hotfix** | 긴급 장애, main 기반, 단일 파일 수정 | Phase 1.5/2 스킵, Check 3만 |
| **Standard** | 일반 기능 구현, 리팩토링, 테스트 추가 | 전체 Phase 수행 (Agent Teams로 병렬 가능) |

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

## 검증 체계 (Verification Gates) — MVP

| 검증 | 시점 | 실행 | 비고 |
|------|------|------|------|
| **Stitch UI** | 디자인 결정 후, 구현 전 | Stitch MCP → HTML/CSS 생성 (UI 작업만) | 선제 |
| Check 3 | 구현 완료 후 | `verify.sh code` (build + test + lint + type) | 필수 |
| Check 3.5 | Check 3 후 | AI가 `spec-compliance-checker` 스킬 참조하여 수동 실행 | 필수 |
| Check 3.7 | Check 3.5 후 | AI가 `code-reviewer` 에이전트 스폰 | 필수 |
| Check 4-5 | PR 생성 전후 | 커밋/브랜치 규칙 + PR Health | 필수 |

> 확장 체크(3.5T, 3.6, 3.7P, 3.8)는 수요 확인 후 단계적 추가. 프론트엔드 PR에서 3.6, 인증/결제 PR에서 3.8 활성화.

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

## Phase 3 TDD 적용

Phase 3 구현 시 TDD(Test-Driven Development) 프로세스를 적용한다.

- **Superpowers 환경**: `superpowers:test-driven-development` 스킬을 적용한다 (Red-Green-Refactor 사이클 강제)
- **Superpowers 미설치 환경 Fallback**:
  1. 실패하는 테스트를 먼저 작성한다 (RED)
  2. 테스트를 통과하는 최소 구현을 작성한다 (GREEN)
  3. 리팩토링한다 (REFACTOR)
  - Iron Law: **프로덕션 코드보다 테스트를 먼저 작성한다. 실패하는 테스트 없이 구현 코드를 작성하지 않는다.**
- **규모별 차등**: Hotfix는 TDD 면제, Standard는 필수

## Auto-Fix 규칙

- Check 실패 시 **1회 자동 수정** → 재실행
- 1회 수정 실패 → **[STOP]** Human에게 보고 (에러 내용 + 시도한 수정 요약)
- 동일 패턴 반복 시 `superpowers:systematic-debugging` 스킬 적용 (설치된 경우)
- autoFix 카운터는 대화 컨텍스트에서 관리 (별도 파일 불필요)

## PR 역할 분리

| 역할 | AI | Human |
|------|:--:|:-----:|
| 브랜치 생성 | O | - |
| 코드 구현 | O | - |
| PR 생성 + 본문 | O | - |
| PR 검토 | - | **O** |
| PR Merge | - | **O** |

## Artifact Deployment Principle (전역 vs 프로젝트)

Trine 산출물(규칙, 스크립트, 설정)은 **범용성 기준**으로 배치한다.

| 구분 | 위치 | 배포 | 예시 |
|------|------|------|------|
| **전역 (범용)** | `~/.claude/trine/` | 모든 프로젝트에 공통 적용 | Agent 정의, 시맨틱 룰, 범용 Hook 스크립트 |
| **프로젝트별 (특수)** | 프로젝트 내 | 해당 프로젝트만 적용 | lint-staged 설정, 프레임워크별 ESLint, 프로젝트 고유 경로 |

### 판단 기준

- **전역**: 언어/프레임워크 무관하게 동작하는가? → Trine 중앙
- **프로젝트별**: 특정 기술 스택/디렉토리 구조에 의존하는가? → 프로젝트 내

### Hook 레이어 적용

| 스크립트 | 범용성 | 배치 |
|---------|:------:|------|
| 시크릿 탐지 | 범용 (패턴 매칭) | Trine 중앙 → trine-sync 배포 |
| JSON 무결성 | 범용 (파서) | Trine 중앙 → trine-sync 배포 |
| dev 의존성 체크 | Node.js 전용 | 프로젝트 내 (Node.js 프로젝트만) |
| i18n dead key | 프로젝트 구조 의존 | 프로젝트 내 (해당 프로젝트만) |
| lint-staged 설정 | 프레임워크 의존 | 프로젝트 내 |
| Husky hook 연결 | Git 프로젝트 범용 | Trine 중앙 (템플릿) → trine-sync 배포 |

### Iron Law

- **IRON**: 범용 산출물을 특정 프로젝트에만 하드코딩하지 않는다. Trine 중앙에 두고 sync로 배포한다.
