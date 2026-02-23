---
description: NanoBanana MCP로 이미지 생성/편집
allowed-tools: Bash, Read, Write
model: haiku
---

# /trine-generate-image — 이미지 생성/편집

NanoBanana MCP (Google Gemini AI)를 사용하여 이미지를 생성하거나 편집합니다.

## 사용법

```
/trine-generate-image <설명>
/trine-generate-image --edit <이미지경로> <편집지시>
```

## 실행

1. NanoBanana MCP ToolSearch로 도구 로드
2. 프롬프트 기반 이미지 생성 또는 편집
3. 결과 이미지 저장

## 주의사항

- `GOOGLE_API_KEY` 환경변수 필수
- 생성 이미지 품질: normal (기본)
- 편집 시 원본 이미지 경로 필수
