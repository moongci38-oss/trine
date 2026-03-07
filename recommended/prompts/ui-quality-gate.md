# Check 3.6: UI/UX 품질 게이트 (Subagent 전용)

> 이 Prompt는 Check 3.6 Subagent에만 주입. 메인 세션 Rules에 포함하지 않음.

## 트리거 조건

UI 관련 파일 (`.tsx`, `.jsx`, `.vue`, `.css`, `.scss`, `.svg`, `.png`, `.jpg`, `.webp`, `.avif`) 변경 시에만 실행.

## 도구 로드 절차

Check 3.6 Subagent는 아래 순서로 도구를 로드한다:

1. ToolSearch로 `playwright` 검색 → 반응형 시각 검증 (필수)
2. ToolSearch로 `nanobanana` 검색 → 이미지 품질 FAIL 시 자동 수정 (선택)
3. ToolSearch로 `lighthouse` 검색 → 성능 감사 (미설치 시 SKIP, FAIL 아님)
4. ToolSearch로 `a11y` 검색 → 접근성 감사 (미설치 시 SKIP, FAIL 아님)

## 검증 영역

### 1. 정적 UI 검증 (프로젝트별 스크립트)

프로젝트 검증 스크립트 실행 (예: `verify.sh ui`).

**공통 검사 항목:**

| 검사 항목 | FAIL 조건 |
|-----------|----------|
| alt 속성 누락 | 이미지에 alt 없음 |
| 디자인 토큰 미사용 | 하드코딩 색상 직접 사용 |
| AI 슬롭 텍스트 | "delve", "leverage" 등 AI 생성 마커 |

### 2. 이미지 품질

| 검사 항목 | FAIL 조건 |
|-----------|----------|
| 파일 크기 | 500KB 초과 |
| 포맷 | WebP/AVIF 미사용 (PNG/JPG만 존재) |
| 해상도 | OG 이미지 1200x630 미충족 |

### 3. 성능/접근성 감사 (MCP 가용 시)

| 도구 | 기준 |
|------|------|
| Lighthouse MCP | LCP < 2.5s, CLS < 0.1 |
| A11y MCP (axe-core) | critical/serious = FAIL |

### 4. 반응형 시각 검증 (Playwright MCP 가용 시)

| 뷰포트 | 사이즈 | 비고 |
|--------|--------|------|
| Mobile (iPhone SE) | 375x812 | 기본 모바일 세로 |
| Mobile (iPhone 14) | 390x844 | 최신 iOS 세로 |
| Mobile (Android) | 360x780 | 일반 Android 세로 |
| Mobile Landscape | 812x375 | 모바일 가로 모드 |
| Tablet | 768x1024 | iPad 세로 |
| Desktop | 1440x900 | 표준 데스크톱 |
| Dark Mode | Desktop + prefers-color-scheme: dark | 다크 모드 |

### 반응형 시각 검증 절차

1. browser_navigate → 개발 서버 URL (localhost:PORT)
2. 뷰포트별 반복:
   a. browser_resize(width, height)
   b. browser_snapshot() → 접근성 트리 확인 (시맨틱 구조 검증)
   c. browser_take_screenshot() → 스크린샷 저장
3. Dark Mode: browser_evaluate로 prefers-color-scheme 설정 후 반복
4. 스크린샷 저장: `docs/walkthroughs/screenshots/{spec-name}/` 하위

### 6. Typography 검증 (정적 분석)

> 타이포그래피 품질을 소스 코드와 컴퓨티드 스타일로 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| font-display | `font-display: swap` 미적용 (외부 폰트) | next/font 미사용 |
| 행간 | 본문 `line-height` < 1.4 | 본문 `line-height` < 1.5 |
| 폰트 크기 | 본문 `font-size` < 14px | 본문 `font-size` < 16px |
| 대비 비율 | 텍스트 대비 < 3:1 | 텍스트 대비 < 4.5:1 |
| 숫자 정렬 | 테이블/가격 숫자에 `tabular-nums` 미적용 | — |

**검증 방법**:
- CSS/Tailwind 설정에서 font 관련 값 추출
- Playwright snapshot에서 computed style 확인
- axe-core 대비 비율 검사 결과 활용

### 7. Animation 검증 (정적 분석)

> 애니메이션 성능과 접근성을 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| reduced-motion | `prefers-reduced-motion` 미디어 쿼리 없음 | 일부 애니메이션만 대응 |
| Layout 트리거 | `width/height/top/left` 애니메이션 사용 | `margin/padding` 애니메이션 |
| will-change 남용 | 10개 이상 요소에 `will-change` 적용 | 5개 이상 적용 |
| 전환 시간 | 애니메이션 duration > 1000ms | duration > 300ms |

**검증 방법**:
- CSS/Tailwind에서 animation/transition 속성 추출
- `prefers-reduced-motion` 미디어 쿼리 존재 확인 (Grep)
- transform/opacity 외 속성 애니메이션 탐지

### 8. Forms 검증 (정적 분석 + Playwright)

> 폼 접근성과 사용성을 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| label 연결 | `<input>` 에 `<label>` 또는 `aria-label` 없음 | `placeholder`만 존재 |
| autocomplete | 로그인/주소 폼에 `autocomplete` 미설정 | — |
| 에러 접근성 | 에러 메시지에 `role="alert"` 없음 | `aria-live` 미설정 |
| 중복 제출 | Submit 버튼에 loading/disabled 처리 없음 | — |
| 필수 표시 | 필수 필드에 `required`/`aria-required` 없음 | 시각적 필수 표시만 존재 |

**검증 방법**:
- Playwright snapshot에서 form 요소 구조 검사
- label↔input 연결 (htmlFor/id 매칭) 확인
- axe-core form 관련 규칙 결과 활용

### 9. Focus States 검증 (Playwright)

> 키보드 네비게이션과 포커스 관리를 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| focus-visible | `outline: none` 또는 `outline: 0` 전역 적용 | `:focus-visible` 스타일 미정의 |
| 탭 순서 | `tabindex` > 0 사용 | `tabindex="-1"` 과다 사용 |
| skip-to-content | 메인 콘텐츠 skip 링크 없음 | — |
| 포커스 트랩 | 모달에 포커스 트랩 없음 (Tab으로 탈출) | 포커스 반환 미구현 |

**검증 방법**:
- CSS에서 `outline: none/0` 전역 선언 탐지
- Playwright로 Tab 키 순서 테스트 (browser_press_key)
- 모달 열기 → Tab 순환 → 트랩 확인

### 10. Dark Mode 검증 (Playwright + 정적 분석)

> 다크 모드 구현 품질을 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| color-scheme | `<meta name="color-scheme">` 없음 | `content`에 `dark` 미포함 |
| CSS 변수 | 하드코딩 색상 사용 (다크 모드 미대응) | 일부 색상만 CSS 변수 |
| 미디어 쿼리 | `prefers-color-scheme` 미디어 쿼리 없음 | — |
| 이미지 대응 | 다크 모드에서 밝은 배경 이미지 미조정 | — |

**검증 방법**:
- Playwright에서 `prefers-color-scheme: dark` 설정 후 스크린샷
- CSS 변수 사용률 측정 (Grep으로 하드코딩 색상 탐지)
- 라이트/다크 스크린샷 비교

### 11. Navigation 검증 (Playwright)

> 네비게이션 품질과 URL 동기화를 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| URL 동기화 | 필터/탭 상태가 URL에 미반영 | searchParams 불완전 |
| 뒤로가기 | 뒤로가기 시 이전 상태 미복원 | 스크롤 위치 미복원 |
| 로딩 상태 | 페이지 전환 시 빈 화면 | spinner만 표시 (skeleton 없음) |
| Deep-linking | 공유 URL로 동일 뷰 미재현 | 일부 상태 누락 |

**검증 방법**:
- Playwright로 필터 적용 → URL 변경 확인
- browser_navigate_back → 이전 상태 비교
- 직접 URL 접근 → 올바른 뷰 렌더링 확인

### 5. 터치 타겟 크기 검증 (정적 분석)

> Playwright snapshot 또는 소스 코드 정적 분석으로 터치 타겟 크기를 검증한다.

| 검사 항목 | FAIL 조건 | WARN 조건 |
|-----------|----------|----------|
| 버튼/링크 크기 | width 또는 height < 44px | width 또는 height < 48px |
| 인터랙티브 요소 간격 | 인접 요소 간 < 4px | 인접 요소 간 < 8px |
| 아이콘 전용 버튼 | 터치 영역 < 44x44px (padding 포함) | 터치 영역 < 48x48px |

**검증 방법**:
- browser_snapshot()에서 인터랙티브 요소의 bounding box 추출
- CSS computed style에서 min-width, min-height, padding 확인
- FAIL 발견 시 `touchTarget` 필드에 이슈 목록 기록

### 이미지 품질 FAIL 시 자동 수정 (NanoBanana 가용 시)

- ToolSearch로 NanoBanana 검색 → 가용 시 edit_image로 최적화 시도
- 결과 JSON에 `nanobananaUsed: true/false` 표기
- NanoBanana 불가 시 WARN 출력 (PASS/FAIL 판정에 영향 없음)

### NanoBanana Visual QA (선택적)

- 캡처된 스크린샷을 NanoBanana generate_image에 전달하여 AI 품질 평가
- 디자인 토큰 일관성, 레이아웃 균형, 시각적 계층 구조 점검
- 결과: JSON의 `visualQA` 필드에 기록 (PASS/FAIL 판정과 독립)

## 결과 반환 형식 (JSON)

```json
{
  "checkId": "check-3.6",
  "status": "PASS|WARN|FAIL",
  "staticUI": { "status": "PASS|FAIL", "issues": [] },
  "imageQuality": { "status": "PASS|FAIL", "issues": [] },
  "lighthouse": { "lcp": 0, "cls": 0, "a11yScore": 0 },
  "wcag": { "critical": 0, "serious": 0, "moderate": 0 },
  "responsive": { "mobile": "PASS|FAIL", "mobileLandscape": "PASS|FAIL", "tablet": "PASS|FAIL", "desktop": "PASS|FAIL", "dark": "PASS|FAIL" },
  "touchTarget": { "status": "PASS|WARN|FAIL", "issues": [] },
  "typography": { "status": "PASS|WARN|FAIL", "issues": [] },
  "animation": { "status": "PASS|WARN|FAIL", "issues": [] },
  "forms": { "status": "PASS|WARN|FAIL", "issues": [] },
  "focusStates": { "status": "PASS|WARN|FAIL", "issues": [] },
  "darkMode": { "status": "PASS|WARN|FAIL", "issues": [] },
  "navigation": { "status": "PASS|WARN|FAIL", "issues": [] },
  "nanobananaUsed": false,
  "visualQA": { "score": null, "notes": "" },
  "summary": "",
  "autoFixable": false
}
```
