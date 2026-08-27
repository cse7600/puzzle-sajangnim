# 나만의 링크 — 유료 서비스 원클릭 이관 기획

기능명: 나만의 링크 원클릭 이관 (가칭 "링크 가져오기")
작성일: 2026-08-27
상태: 🟡 기획 단계 — 코드 미착수
기반 기능: puzzle-sajangnim `나만의 링크` (프로덕션 배포 완료, `link_pages`/`link_blocks` 테이블 기준 2026-08-26~)

> 이 문서는 `문서/바이오인링크/인포크링크 훔쳐오기.md`(레페리오 링크 대상 기획)를 puzzle-sajangnim 실제 코드베이스에
> 맞춰 재작성한 버전이다. 레페리오 저장소(`/Users/hokang2father/레페리오/referio-platform`)는 건드리지 않는다 — puzzle-sajangnim만의
> 독립 구현이다. 원본 문서는 참고용으로 남겨두되, 실행 기준은 이 문서를 따른다.

## 0. 네이밍

puzzle-sajangnim의 링크인바이오 기능 이름은 "나만의 링크"(대시보드 `/my-link`, 공개 페이지 `/l/[handle]`)다.
이관 기능은 이 기존 기능의 서브 기능으로 붙는다 — 신규 서비스가 아니다.

## 1. 배경 / 목적

**PO 목표:** 인포크링크(link.inpock.co.kr) 같은 유료 링크인바이오 서비스를 쓰는 사장님이,
URL 한 번 붙여넣기로 기존 페이지를 "나만의 링크"(무료)로 그대로 옮겨오게 해서 유료→무료 전환 장벽을 없앤다.

**성공 기준:** 붙여넣기 → 미리보기 검토 → 적용, 3단계 이내. 방문자가 원본과 구분하기 어려울 정도의 시각적 근접도.

**전제 조건:** "손쉬운 이관"이 성립하려면 나만의 링크의 디자인 표현력이 원본 서비스가 지원하는 시각적 변주를
대부분 흡수할 수 있어야 한다. 3장에서 실측한 갭이 이 전제의 핵심 리스크다.

## 2. 범위 원칙

| 갈래 | 내용 | 이 기획의 범위 |
|---|---|---|
| (a) 콘텐츠 이관 | 파트너 본인 소유 텍스트·링크 URL·본인 업로드 이미지·프로필 정보 | ✅ 포함 (법적 문제 없음, 핵심) |
| (b) 스타일 근접 재현 | 배경색/그라디언트/폰트/모서리·그림자/버튼색 등 "느낌"을 최대한 비슷하게 매핑 | ✅ 포함 (3장 갭 보완 후) |
| (c) 픽셀 단위 완전 동일 | 원본 서비스 고유 UI 컴포넌트·자체 그래픽 자산·워터마크·로고까지 그대로 복제 | ❌ 제외 — 상표·저작권 리스크 (6장) |

## 3. 현재 코드 기준 디자인 표현력 실측 — 갭 목록

`lib/link-themes.ts` + `app/(app)/my-link/page.tsx` 실측 결과. 원본 문서는 다른 저장소(레페리오) 코드를
기준으로 갭을 추정한 것이라 이 목록과 다르다 — 반드시 이 목록을 기준으로 삼는다.

이미 지원됨 (갭 아님):
- 배경 3모드: 테마 기본 / 단색(프리셋) / 그라디언트(6종, `GRADIENT_PRESETS`)
- 폰트 4종 프리셋 (`FONT_PRESETS`: 프리텐다드/노토산스KR/고운돋움/나눔고딕, Google Fonts 연동)
- 블록 그림자 4단계 (`BLOCK_SHADOWS`: none/soft/medium/strong)
- 레이아웃 3종 (`profile_only`/`cover_top`/`cover_profile_overlap`)
- 버튼색·공지색 자유 hex (`block_style.buttonColor`/`noticeColor`, `isHexColor` 검증)
- SNS 링크는 이미 `{platform, url}` 구조 — URL 그대로 저장, 핸들→URL 변환 불요

실제 갭 (P0 — 이관 정확도에 직결):
1. **배경 단색 자유 hex 불가** — `SOLID_COLORS` 프리셋 중 선택만 가능, 원본 페이지 배경이 프리셋에 없는 색이면 근사값으로 스냅됨 (`my-link/page.tsx:872` 부근)
2. **배경 이미지 모드 없음** — `pageMode`가 `theme`/`solid`/`gradient` 3종뿐, 이미지 업로드 배경 불가
3. **블록 모양 3종 한정** — `BLOCK_SHAPES`가 `round`/`soft`/`square`뿐 (`lib/link-themes.ts:111`), 원본 서비스가 더 각진/더 둥근 값을 쓰면 스냅됨
4. **블록별 정렬(align) 커스터마이즈 없음** — `block_style.align`이 페이지 전역 설정 하나뿐, 블록 단위 오버라이드 불가

이번 이관 기능 범위에서는 이미지·동영상·SNS 피드형 임베드, 카운트다운, 폼 블록 등은 다루지 않는다 —
기존 7종 블록 타입(`text`/`link`/`image`/`program_collection`/`collection`/`calendar`/`divider`)으로 근사 변환.

## 4. 지원 소스 범위

- **1차: 인포크링크(link.inpock.co.kr) 단일 소스.** PO가 예시로 든 서비스이자 국내 대표 링크인바이오.
- **확장 후보:** 리틀리(litt.ly), 링크트리(linktr.ee) 등. 서비스마다 DOM 구조·API가 달라 소스별 파서 어댑터 필요.
  신규 소스 추가는 어댑터 1개 추가로 확장되는 구조로 설계한다.

## 5. 전체 흐름

```
[파트너] 대시보드 > 나만의 링크(/my-link) > "다른 서비스에서 가져오기"
    ↓ URL 붙여넣기 (예: link.inpock.co.kr/09women)
[서버] 도메인으로 소스 식별 → 미지원 도메인이면 즉시 안내
    ↓
[서버] 일반 HTTP fetch로 원본 페이지 요청
    → 인포크링크는 Next.js SSR이라 <script id="__NEXT_DATA__">에 profile/design/blocks가
      완성된 JSON으로 들어있음 — 헤드리스 브라우저 불요, fetch + JSON 파싱으로 충분
    ├─ 프로필: 이름/소개/아바타/SNS(이미 {platform,url} 구조라 puzzle 스키마와 그대로 매핑)
    ├─ 블록: 순서/타입/제목/url/썸네일
    └─ 디자인: 배경색·타이포·모서리·그림자·강조색 등
    ↓
[서버] 블록 url이 인포크 자체 트래킹 단축링크(예: /api/r/{token})면 리다이렉트를 끝까지 따라가
       실제 도착지로 치환 (안 하면 이관 후에도 클릭이 인포크 서버를 계속 거침)
    ↓
[서버] 이미지(아바타/썸네일/배경) 원본 CDN에서 다운로드 → Supabase Storage 재업로드
       (핫링크 금지 — 원본 CDN 만료/차단 시 우리 페이지가 깨지는 것 방지 + 소유권 이전)
    ↓
[서버] 색상/폰트/모양 값을 link_pages/link_blocks 스키마에 매핑
       (3장 P0 갭 4건은 신규 지원 후 매핑, 그 외는 가장 가까운 프리셋으로 근사)
    ↓
[파트너] 미리보기 화면 (가져온 결과 vs 원본 스크린샷 나란히 비교)
    → 블록 단위로 가져올지 체크박스 선택 가능
    ↓
[파트너] "적용" → link_pages / link_blocks에 저장
    (기존 데이터 있으면 "덮어쓰기 vs 추가" 선택 모달 — link_pages는 user_id UNIQUE라 페이지 자체는 항상 1개)
```

## 6. 데이터 모델 추가안

`link_pages.background` / `block_style`이 이미 JSONB이므로 3장 P0 갭 4건은 신규 마이그레이션 없이
키 추가만으로 해결 가능 (예: `background.pageMode: 'image'`, `background.hex`, `block_style.shape` 값 확장,
`link_blocks.payload.align`).

착수 전 확인: `migrations/*.sql`이 실 DB와 불일치할 수 있다는 기존 스키마 드리프트 이슈가 있다(`schema-drift-supabase` 메모리 참고).
`link_pages.background`/`block_style`, `link_blocks.payload`가 실 DB에서도 JSONB인지 서비스 롤 키로 REST API 대조 1회 선행할 것.

신규 필요 항목:

| 테이블/버킷 | 설명 |
|---|---|
| `link_import_jobs` (신규 테이블) | `id, user_id, source_type(inpock 등), source_url, status(pending/parsing/preview/applied/failed), parsed_payload JSONB, error_message, created_at`. 크롤링이 수 초~수십 초 걸릴 수 있어 상태 추적 필요 — 파트너가 화면을 벗어났다 돌아와도 진행 상황 확인 가능. RLS: `user_id = auth.uid()` |
| `link-import-assets` (신규 Storage 버킷) | 원본에서 재호스팅한 아바타/썸네일/배경 이미지. 기존 `board-images` 버킷과 분리해 이관 자산만 따로 추적 |

## 7. 리스크 / PO 확인 필요

| # | 항목 | 내용 |
|---|---|---|
| 1 | 상표·저작권 리스크 | 인포크링크는 경쟁 유료 서비스. 레이아웃/색상 조합을 유사 재현하는 것과 로고·워터마크·고유 그래픽 자산까지 복제하는 것은 다르다. 후자는 하지 않는다(2장 (c) 참고) — PO 최종 확정 필요 |
| 2 | 대상 서비스 크롤링 약관 | link.inpock.co.kr의 robots.txt·이용약관에 스크래핑 금지 조항이 있는지 착수 전 확인 필요 |
| 3 | 본인 소유 확인 | "이 URL이 정말 당신 페이지가 맞습니까?" 검증 없으면 타인 페이지를 무단 등록하는 악용 가능. SNS 계정 대조 또는 원본 프로필에 확인 문구 추가 요청 등 소유권 확인 절차 필요 |
| 4 | 파서 유지보수 부담 | 원본 사이트 구조가 바뀌면 파서가 깨짐 — 일회성이 아니라 지속 유지보수 항목 |
| 5 | 재호스팅 이미지 저작권 고지 | 브랜드 협찬 이미지 등 제3자 저작물 재업로드에 대한 파트너 동의 안내 문구 필요 |
| 6 | 원본 서비스 트래킹 링크 잔존 | 리다이렉트 해석 없이 저장하면 이관 후에도 클릭이 원본 서버를 계속 거치고, 원본이 트래킹을 만료/차단하면 파트너 링크가 조용히 죽는 위험 — 저장 전 반드시 최종 도착지까지 해석 (5장 흐름도 반영 완료) |

## 8. 마일스톤 제안

1. PO 확정 — 7장 리스크 6개, 특히 상표권 범위와 본인확인 방식
2. 디자인 시스템 확장 — 3장 P0 갭 4건 (배경 자유 hex, 배경 이미지 모드, 블록 모양 확장, 블록별 정렬). 마이그레이션 불요
3. 인포크링크 단일 소스 파서 PoC — fetch → `__NEXT_DATA__` 파싱 → 리다이렉트 해석 → 이미지 재호스팅 → 스키마 매핑 실제 실행 검증
4. `link_import_jobs` 테이블 + 임포트 잡 큐 + 미리보기 화면 + 적용 플로우 구현
5. 베타 — 인포크링크 실사용 사장님 1~2명 대상 실사용 테스트
6. 확장 — 리틀리 등 소스 어댑터 추가

## 9. 참고

| 참고 대상 | 위치 |
|---|---|
| 나만의 링크 대시보드 (디자인 패널 포함) | `app/(app)/my-link/page.tsx` |
| 공개 페이지 렌더러 | `app/l/[handle]/ProfileView.tsx`, `app/l/[handle]/page.tsx` |
| 테마/프리셋 소스 | `lib/link-themes.ts` |
| 블록 CRUD API | `app/api/link-page/route.ts`, `app/api/link-page/blocks/route.ts` (`BLOCK_TYPES`) |
| 공개 페이지 API | `app/api/public/link-page/[handle]/*` |
| 페이지 스키마 | `migrations/021_link_pages.sql` |
| 블록 스키마 | `migrations/022_link_blocks.sql` |
| 통계 스키마 | `migrations/023_link_daily_stats.sql` |
| 이미지 업로드 (기존 재사용 참고용) | `app/api/link-page/upload/route.ts` (`board-images` 버킷) |
| 원본(레페리오 링크 대상) 기획 — 이 저장소 `문서/` 폴더 소재, 재작성 전 참고용 | `문서/바이오인링크/인포크링크 훔쳐오기.md` |

## 10. 진행 이력

| 날짜 | 내용 |
|---|---|
| 2026-08-27 | 레페리오 대상 원본 기획서를 puzzle-sajangnim 실제 코드(`my-link/page.tsx`, `link-themes.ts`, `link_pages`/`link_blocks` 스키마) 기준으로 재작성. 레페리오 저장소는 건드리지 않음 |
| 2026-08-27 | GSD 전체 구현 완료. A(디자인 4건) + B(파이프라인) + C(UI). Match Rate 92%. VERIFICATION 문서 작성 완료 |
