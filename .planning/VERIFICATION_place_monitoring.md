---
phase: place_monitoring
verified: 2026-06-20
status: passed
score: 4/4 Task PASS
match_rate: 97%
blockers: 0
majors: 0
minors: 2
---

# 네이버 플레이스 모니터링 — 검증 리포트

**페이즈 목표:** place 페이지가 목업이 아닌 실데이터 연동으로, 플레이스 등록→키워드 추가→순위/추이 표시 흐름이 동작(네이버 fetch 실패 시에도 graceful degrade)

**검증일:** 2026-06-20
**상태:** PASSED (Match Rate 97%)
**커밋:** 697d5ea(DB) · 1010458(lib) · fe1bf1c(API) · 3035e57(UI) — 4개 모두 원자적, 존재 확인

---

## Task별 결과

| Task | 영역 | 결과 | Match Rate |
|------|------|------|-----------|
| Task 1 | DB 마이그레이션 | PASS | 100% |
| Task 2 | lib/naver-place.ts | PASS | 95% |
| Task 3 | API routes | PASS | 100% |
| Task 4 | UI 연동 | PASS | 95% |
| **전체** | | **PASS** | **97%** |

---

## Task 1 — DB 마이그레이션 (PASS, 100%)

| 검증 기준 | 결과 | 증거 |
|-----------|------|------|
| 4개 테이블 생성 | ✓ | `005:9,26,38,56` — registrations/keywords/snapshots/keyword_rankings |
| `unique(user_id, naver_place_id)` | ✓ | `005:20` |
| `unique(registration_id, keyword)` | ✓ | `005:32` |
| `unique(registration_id, snapshot_date)` | ✓ | `005:49` |
| `unique(keyword_id, snapshot_date)` | ✓ | `005:65` |
| `rating numeric(3,2)`, `raw_data jsonb` | ✓ | `005:45,47` |
| `rank` nullable (순위권 밖) | ✓ | `005:60` 주석 명시 |
| 인덱스 4개 | ✓ | `005:23,35,52,68` |
| RLS enable + select using(true) | ✓ | `005:72-86`, drop 선행으로 멱등 |
| **트리거 미사용** | ✓ | grep trigger/moddatetime/create function → 0건. `updated_at`은 register route `82`에서 수동 세팅 |
| FK `public.users(id)` | ✓ | `005:11` |

DB 적용: Supabase `nbfoifegbamvtwffbuxv`에 4개 테이블 생성 확인됨(팀리드 보고).

---

## Task 2 — lib/naver-place.ts (PASS, 95%)

| 검증 기준 | 결과 | 증거 |
|-----------|------|------|
| export: parsePlaceId/fetchPlaceInfo/fetchKeywordRank/resolveShortUrl + 3 타입 | ✓ | `naver-place.ts:11,16,28,70,94,231,275` |
| `m.place.naver.com/restaurant/{id}` → restaurant | ✓ PASS | 실행 테스트 통과 |
| `map.naver.com/p/entry/place/{id}` → id 추출 | ✓ PASS | 실행 테스트 통과 |
| 순수 ID `1085956231` → unknown | ✓ PASS | 실행 테스트 통과 |
| 잘못된 URL → throw | ✓ PASS | `naver-place.ts:86` throw 확인, 실행 테스트 통과 |
| fetch 계열 실패 시 throw (try/catch는 호출부) | ✓ | `fetchJsonWithRetry:151` throw, `fetchPlaceInfo`/`fetchKeywordRank` 호출부 catch 없음 |
| any 미사용 | ✓ | unknown + readPath 헬퍼로 방어. any 0건 |
| tsc --noEmit | ✓ | exit 0 |

방어 설계 우수: `readPath`/`asNumber`/`asString` 헬퍼로 LOW 신뢰도 응답을 옵셔널 체이닝 격리. isAd/ad 두 필드 모두 체크(`isAdEntry:264`). AbortController 8s + 1회 재시도(`fetchJsonWithRetry:140`).

**minor-1:** `fetchKeywordRank`(`275-311`) 본문이 시그니처 멀티라인 포함 37줄, 순수 로직 ~34줄로 전역 규칙 "함수 30줄 이하" 경계를 약간 초과. organic rank 카운팅 루프를 헬퍼로 추출하면 해소. 동작/타입 영향 없음.

---

## Task 3 — API Routes (PASS, 100%)

| 검증 기준 | 결과 | 증거 |
|-----------|------|------|
| 4개 라우트 force-dynamic + supabaseAdmin as any + DEMO_USER_ID | ✓ | 각 파일 `1행 dynamic`, `as any` 캐스팅, `DEMO_USER_ID` import |
| **ad-accounts 구식 패턴 미사용** | ✓ | place 라우트에 `demo-user-001`/`createClient(`/anon/목 fallback 0건. (대조: ad-accounts/route.ts:5는 `demo-user-001` 문자열 + mock 사용 — place는 미답습) |
| register POST graceful degradation | ✓ | `register:66-70` fetch try/catch, `72-87` 등록 upsert는 try 밖, `96-100` fetch 실패 시 201 + fetch_failed:true |
| register 잘못된 URL → 400 | ✓ | `register:54-61` |
| register GET Cache-Control 헤더 | ✓ | `register:130,147` s-maxage=30 |
| keywords 중복 → 409 | ✓ | `keywords:39-41` error.code 23505 → 409 |
| keywords DELETE → {ok:true} | ✓ | `keywords:60` |
| snapshots asc 정렬 | ✓ | `snapshots:30` ascending:true |
| rankings series 키워드별 그룹 | ✓ | `rankings:71-75` keywords.map → buildSeries, asc 정렬 |
| **upsert onConflict ↔ DB unique 일치** | ✓ | register `user_id,naver_place_id`=`005:20`, `registration_id,snapshot_date`=`005:49` 정확히 일치 |
| tsc | ✓ | exit 0 |

추가 강점: keywords POST에 `ownsRegistration`(`keywords:11-19`)로 타 유저 조작 차단(404). register는 insert 대신 upsert로 재수집(handleRefresh) 멱등 지원.

---

## Task 4 — UI 연동 (PASS, 95%)

| 검증 기준 | 결과 | 증거 |
|-----------|------|------|
| useEffect로 register/keywords/rankings 호출, 목업 상수 대신 state | ✓ | `page.tsx:89-119` loadKeywordData/loadRegistrations, useState 5개 |
| 목업 KEYWORDS/TREND_DATA 제거 | ✓ | grep → 0건 (실데이터 state로 대체) |
| 로딩 = 스켈레톤 (스피너 단독 아님) | ✓ | `page.tsx:209,595` PlaceSkeleton + `components.tsx:38` SkeletonCard(animate-pulse 회색 박스) |
| 등록 모달 URL 입력 → POST → 갱신 | ✓ | `page.tsx:121-151` submitRegister, `components.tsx:49` RegisterModal |
| fetch_failed 시 "기본정보 수집 대기중" | ✓ | `page.tsx:146` 모달 notice + `273-276` 정보바 배지 |
| 키워드 추가/삭제 → API → 갱신 | ✓ | `page.tsx:153-189` addKeyword/removeKeyword, 409 처리(`169`) |
| COMPETITORS/CHECKLIST 목업 유지 + 주석 | ✓ | `page.tsx:52,61` "후속 페이즈" 주석, `371,439` 섹션 상단 주석 |
| rank=null 차트 처리 | ✓ | `components.tsx:179 buildSegments` null 경계로 polyline 분절, `163-164` null 점 스킵 |
| npm run build / 콘솔 에러 | ✓ | 팀리드 확인됨(build 정상), console.log 0건 |
| 빈 catch 없음 | ✓ | UI는 `.catch(()=>null)` 후 `if(!res)` 처리(`136,165`), 빈 catch/빈 핸들러 0건 |
| 빈 상태(등록 0건) 렌더 | ✓ | `page.tsx:211,566` EmptyState |

signal/trend/delta 산출 로직 분리(`lib.ts:15 rankToSignal` green<10/yellow<20/red, `23 rankTrend` 직전 대비). 차트 라벨 M/D 변환(`lib.ts:54`).

**minor-2:** `submitRegister`(`page.tsx:121-151`) 31줄로 30줄 경계 1줄 초과. 페이지 컴포넌트 내부 핸들러로 영향 경미.

---

## 전역 규칙 스캔 결과

| 규칙 | 결과 |
|------|------|
| console.log | 0건 (전체 산출물) |
| 빈 catch 블록 | 0건 (모든 catch가 graceful degrade 또는 에러 응답 처리) |
| any 남용 | supabaseAdmin 캐스팅 6건만 (D-03 표준 패턴, 허용). naver-place.ts/UI는 0건 |
| 이모지 | 0건 (grep 매치는 주석 내 `→` 화살표, 이모지 아님) |
| 함수 30줄 초과 | 2건(minor): fetchKeywordRank ~34줄, submitRegister 31줄 |
| 제네릭 변수명(data/result/item/temp) | 구조분해 `data:` 별칭(registration/snapshots 등 의미명) 사용. 제네릭 잔존 없음 |
| 슬롭 단어/placeholder 주석 | 0건 (grep placeholder 매치는 HTML input 속성/Tailwind 클래스) |
| tsc --noEmit | exit 0 |

---

## 갭/위반 요약

**Blocker:** 없음
**Major:** 없음
**Minor (2건):**
1. `lib/naver-place.ts:275` fetchKeywordRank 함수 ~34줄 — organic 카운팅 루프 헬퍼 추출 권장
2. `app/(app)/place/page.tsx:121` submitRegister 31줄 — 경계 1줄 초과

두 minor 모두 동작·타입·보안 영향 없음. 페이즈 목표(등록→키워드→순위/추이, graceful degrade)는 코드 레벨에서 완전 충족.

## 인간 검증 권장 (런타임)

코드 정합성은 완전하나 다음은 실제 네이버 응답에 의존하므로 런타임 확인 권장:
1. **실 네이버 fetch 동작:** GraphQL operation(`getPlaceMain`)/allSearch 응답 구조는 LOW 신뢰도 추정값. fetchPlaceInfo/fetchKeywordRank가 실제 데이터를 매핑하는지 — 실패해도 graceful degrade(fetch_failed)로 설계되어 등록/UI는 정상.
2. **등록→키워드→차트 E2E:** 실 URL 등록 후 키워드 추가, 순위 수집 이력 누적 시 차트 렌더(현재는 스케줄러 범위 밖이라 수집 이력 0 상태에서 빈 상태 안내가 정상).

---

_검증: Claude (gsd-verifier) — 2026-06-20_
