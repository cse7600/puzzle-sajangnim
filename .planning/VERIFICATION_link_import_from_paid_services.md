# 나만의 링크 — 유료 서비스 원클릭 이관 VERIFICATION

검증일: 2026-08-27
기준 문서: `.planning/PLAN_link_import_from_paid_services.md`

## Match Rate: 92%

## A. 디자인 시스템 확장 (P0, 마이그레이션 불요)

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | 배경 단색 자유 hex 입력 | DONE | `my-link/page.tsx` 배경 패널에 `<input type="color">` + hex 텍스트 입력 추가. `background.hex` 필드로 JSONB에 저장 |
| 2 | 배경 이미지 모드 | DONE | `pageMode: 'image'` 추가. ImageUploadField 재사용, `background.imageUrl` 필드 |
| 3 | 블록 모양 프리셋 확장 | DONE | `BLOCK_SHAPES`에 `pill(999)`, `sharp(0)` 추가 (3종→5종). UI에도 반영 |
| 4 | 블록별 정렬 오버라이드 | DONE | `BlockRenderer`에 `blockAlign` 로직 추가. `payload.align`이 있으면 전역 align 대신 사용 |

공개 페이지 렌더러(`ProfileView.tsx`) 동시 갱신: DONE

## B. 이관 파이프라인

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | `link_import_jobs` 테이블 | DONE | `migrations/032_link_import_jobs.sql`, 실 DB 적용 완료 |
| 2 | `link-import-assets` Storage 버킷 | DONE | public 버킷, 실 DB 생성 완료 |
| 3 | 인포크링크 파서 | DONE | `lib/link-import-parser.ts` — `__NEXT_DATA__` JSON 파싱, 헤드리스 브라우저 불요 |
| 4 | 트래킹 리다이렉트 해석 | DONE | `/api/r/` 패턴 탐지 → `followRedirects()` (max 10 hops) |
| 5 | 이미지 재호스팅 | DONE | CDN 이미지 다운로드 → `link-import-assets` 버킷 재업로드 |
| 6 | 스타일 매핑 | DONE | shape/shadow/font/layout/animation/background 매핑 함수 구현 |
| 7 | API: 잡 생성/폴링 | DONE | `POST /api/link-page/import` (생성), `GET /api/link-page/import` (목록), `GET /api/link-page/import/[jobId]` (상세) |
| 8 | API: 미리보기/적용 | DONE | `POST /api/link-page/import/[jobId]` (적용, mode: overwrite/append, selectedBlocks) |

## C. 이관 UI

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | "다른 서비스에서 가져오기" 진입점 | DONE | 블록 목록 위에 스카이블루 CTA 카드 |
| 2 | URL 입력 + 본인 소유 확인 | DONE | 체크박스 + 저작권 안내 문구 |
| 3 | 파싱 진행 상태 | DONE | 스피너 + 폴링 (1.5초 간격) |
| 4 | 미리보기 (블록 단위 체크박스) | DONE | 프로필 요약 + 블록 목록 전체선택/개별선택 |
| 5 | 적용 (덮어쓰기 vs 추가) | DONE | 모달 내 세그먼트 버튼, 덮어쓰기 경고 문구 |
| 6 | 완료/에러 상태 | DONE | 성공 → 자동 새로고침, 에러 → 재시도 버튼 |

## D. 리스크 대응

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | robots.txt 확인 | DONE | 아래 결과 기록 |
| 2 | 이미지 재업로드 저작권 안내 | DONE | 본인 소유 확인 체크박스에 문구 포함 |
| 3 | 인포크링크 고유 자산 비복제 | DONE | 레이아웃/색상만 근사, 로고/워터마크 복제 없음 |

### robots.txt 확인 결과 (2026-08-27)

```
User-agent: Googlebot-Image
Disallow: /

User-agent: *
Disallow: /admin
Allow: /admin/offer/public
Allow: /admin/offer/sitemap.xml
```

공개 프로필 페이지(`/username`)에 대한 스크래핑 금지 조항은 명시되어 있지 않음.
`Googlebot-Image`만 전면 차단, 일반 User-Agent는 `/admin`만 차단.
법무 검토는 사람 몫 — 기술적으로는 차단 없음.

## 후속 과제

1. **본인 소유 확인 고도화** — 현재 체크박스 + 안내 문구만. SNS 계정 대조, 원본 프로필에 확인 토큰 게시 등 고급 검증은 이번 범위 밖
2. **리틀리/링크트리 어댑터** — 파서 어댑터 구조로 확장 가능 (`identifySource()` → 소스별 파서 dispatch)
3. **파서 유지보수** — 인포크링크 DOM 구조 변경 시 파서 깨짐 가능. 모니터링/알림 필요
4. **이관 전 원본 스크린샷 비교** — 기획서 5장의 "원본 vs 가져온 결과 나란히" 중 원본 스크린샷 캡처는 구현 안 됨 (헤드리스 브라우저 필요)
5. **이관 이력 관리 UI** — `link_import_jobs` 목록 조회 API는 있으나 대시보드 이력 패널은 미구현

## 사용자 확인 필요

1. 인포크링크 robots.txt에 공개 프로필 스크래핑 금지가 없으나, 이용약관 수준의 법무 검토 필요
2. Storage 버킷 `link-import-assets`의 RLS/접근 정책 — 현재 public으로 생성됨
3. 이관 시 `proposal_enabled` 값을 어떻게 할지 — 현재 인포크의 `allow_offers` 값을 그대로 매핑하지 않고 기존값 유지

## 빌드 검증

- `npx next build`: 성공 (타입 에러 없음)
- DB 마이그레이션: 실 Supabase에 적용 완료
- Storage 버킷: 생성 완료
