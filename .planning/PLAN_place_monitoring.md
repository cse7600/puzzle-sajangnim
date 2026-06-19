# PLAN — 네이버 플레이스 모니터링 시스템

**작성일:** 2026-06-19
**입력:** RESEARCH_db_api.md (HIGH), RESEARCH_crawling_tech.md (LOW)
**스코프:** 내 플레이스 기본정보 추이 + 키워드 순위 추이
**범위 밖 (목업 유지):** COMPETITORS(경쟁자), CHECKLIST(진단 체크리스트), 자동 수집 스케줄러(Railway/cron)

---

## 확정 설계 결정 (PO 승인 — 이대로 구현)

| # | 결정 | 근거 |
|---|------|------|
| D-01 | 테이블 4개: `puzl_place_registrations`, `puzl_place_keywords`, `puzl_place_snapshots`, `puzl_keyword_rankings`. DDL은 RESEARCH_db_api.md §1 그대로 | RESEARCH 검증됨 |
| D-02 | 마이그레이션 파일: `migrations/005_place_monitoring.sql` | 다음 번호 |
| D-03 | API 표준 패턴: `community/posts/route.ts` 기준 (`supabaseAdmin as any`, `DEMO_USER_ID`, `force-dynamic`). **ad-accounts 구식 패턴 금지** | RESEARCH §컨벤션 |
| D-04 | `user_id = DEMO_USER_ID '00000000-0000-0000-0000-000000000001'` | lib/auth.ts |
| D-05 | 네이버 수집 전부 `lib/naver-place.ts`에 격리. graceful degradation: register fetch 실패해도 등록 row 저장, snapshot=null, `fetch_failed:true` 반환 | RESEARCH §5 |
| D-06 | `parsePlaceId`는 정규식 기반(네트워크 불필요)으로 확실히 동작. fetch 계열만 LOW 신뢰도 | RESEARCH §3 |
| D-07 | 실 Supabase 프로젝트 = `nbfoifegbamvtwffbuxv` (.env.local `NEXT_PUBLIC_SUPABASE_URL` 확인 완료) | 검증됨 |

---

## 환경 확인 결과 (검증 완료)

- `.env.local` → `NEXT_PUBLIC_SUPABASE_URL = https://nbfoifegbamvtwffbuxv.supabase.co` → **마이그레이션은 `nbfoifegbamvtwffbuxv` 프로젝트에 적용**
- `migrations/` 에 001~004 존재 → 다음은 `005`
- `app/api/place/` 디렉토리 **없음** → 신규 생성 필요
- 표준 클라이언트: `lib/supabase-admin.ts` (`supabaseAdmin` 쓰기 / `supabaseAdminCached` 30s 읽기)
- `DEMO_USER_ID` = `'00000000-0000-0000-0000-000000000001'` (lib/auth.ts)

---

## Task 의존성 그래프

```
Task 1 (DB)  ──┐
               ├──> Task 3 (API routes) ──> Task 4 (UI)
Task 2 (lib)  ─┘
```

- **Wave 1 (병렬):** Task 1, Task 2 (서로 독립 — DB 마이그레이션 / 순수 라이브러리)
- **Wave 2:** Task 3 (Task 1 테이블 + Task 2 함수 둘 다 필요)
- **Wave 3:** Task 4 (Task 3 API 엔드포인트 필요)

각 Task = 원자적 커밋 1개.

---

## Task 1 — DB 마이그레이션

| 항목 | 내용 |
|------|------|
| **파일** | `migrations/005_place_monitoring.sql` (신규) |
| **의존성** | 없음 (Wave 1) |
| **예상 컨텍스트** | ~10% (단일 DDL 파일) |

### 구현 포인트

1. RESEARCH_db_api.md §1 DDL을 **그대로** 작성. 4개 테이블 + 인덱스 + RLS(`enable` + `select using(true)`).
   - `puzl_place_registrations`: `unique(user_id, naver_place_id)`, `updated_at` 컬럼 보유
   - `puzl_place_keywords`: `unique(registration_id, keyword)`
   - `puzl_place_snapshots`: `unique(registration_id, snapshot_date)`, `raw_data jsonb`, `rating numeric(3,2)`
   - `puzl_keyword_rankings`: `unique(keyword_id, snapshot_date)`, `rank` nullable(=순위권 밖)
2. **트리거 미사용** — `updated_at`은 코드에서 수동. moddatetime/trigger 0건 유지 (003 스타일 일치).
3. 헤더 주석: 마이그레이션 번호/목적/트리거 미사용/user_id 출처 명시 (003 스타일).
4. FK 대상 `public.users(id)` 존재 확인됨 (003에서 데모 유저 시드).

### 마이그레이션 적용 방법 (Supabase Management API)

대상 프로젝트 ref: **`nbfoifegbamvtwffbuxv`** (D-07 확인). Management API Key는 `~/.claude/CREDENTIALS.md` 참조.

```
POST https://api.supabase.com/v1/projects/nbfoifegbamvtwffbuxv/database/query
Authorization: Bearer <MANAGEMENT_API_KEY>
Content-Type: application/json
{ "query": "<005_place_monitoring.sql 전체 내용>" }
```

- 파일 내용 전체를 `query` 필드에 그대로 전송 (DDL은 멱등 — `create table if not exists`).
- 적용 후 검증 쿼리로 4개 테이블 존재 확인 (아래 검증 기준 참조).

### 완료 검증 기준

- [ ] `migrations/005_place_monitoring.sql` 파일 존재, RESEARCH §1 DDL과 일치
- [ ] Management API로 적용 시 에러 없음 (200)
- [ ] 검증: `select table_name from information_schema.tables where table_name like 'puzl_place_%' or table_name = 'puzl_keyword_rankings'` → 4개 row 반환
- [ ] 검증: `puzl_place_registrations` 에 `unique(user_id, naver_place_id)` 제약 존재
- [ ] 트리거 0건: `select count(*) from information_schema.triggers where event_object_table like 'puzl_%'` → 0

### 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| `users` 테이블 FK 미존재 | 낮음 | 003에서 시드 확인됨 |
| Management API Key 만료/권한 | 중 | 실패 시 Supabase 대시보드 SQL Editor 수동 실행 fallback |
| 동일 SQL 재실행 | — | `if not exists`로 멱등, 정책은 재실행 시 중복 에러 → 정책에도 `drop policy if exists` 선행 권장 |

---

## Task 2 — `lib/naver-place.ts` (네이버 수집 격리)

| 항목 | 내용 |
|------|------|
| **파일** | `lib/naver-place.ts` (신규) |
| **의존성** | 없음 (Wave 1) |
| **예상 컨텍스트** | ~25% (정규식 + 2개 GraphQL fetch) |

### 구현 포인트

함수 시그니처는 RESEARCH_db_api.md §3 **그대로**. 타입: `ParsedPlace`, `PlaceBasicInfo`, `KeywordRankResult`.

**`parsePlaceId(input: string): ParsedPlace`** — D-06, 네트워크 불필요, 정규식 기반. 반드시 동작.
- 지원 포맷 (RESEARCH §2 패턴표):
  - `/place/(\d+)` — m.place / map.naver.com entry·search
  - `place\.naver\.com/[^/]+/(\d+)` — restaurant/hairshop 등
  - `/restaurant/(\d+)`, `/hospital/(\d+)` 등 타입 세그먼트
  - 순수 숫자 입력 `^\d+$`
- `type` 추출: URL의 `/restaurant|hairshop|hospital|place/` 세그먼트 → 매칭 안되면 `'unknown'`
- ID 못 찾으면 `throw new Error`. **naver.me 단축 URL은 async 리다이렉트가 필요하므로 parsePlaceId(동기)에서 분리** → 별도 `resolveShortUrl(url): Promise<string>` (HEAD/GET `redirect:'follow'`) 추가하고, register route에서 naver.me 감지 시 먼저 resolve 후 parsePlaceId 호출.

**`fetchPlaceInfo(placeId): Promise<PlaceBasicInfo>`** — LOW 신뢰도, try 내부에서만.
- 엔드포인트: `https://pcmap-api.place.naver.com/graphql` (RESEARCH §1 계열). operationName/query는 구현 시점 추정값 사용 (`getPlaceMain` 류).
- 헤더 (RESEARCH §1): 모바일 `User-Agent`, `Referer: https://m.place.naver.com/`, `Accept: application/json`, `Content-Type: application/json`, `Origin: https://map.naver.com`.
- `AbortController` 8s 타임아웃 + 1회 재시도.
- 응답 → `PlaceBasicInfo` 매핑 (name/address/category/reviewCount/visitorReviewCount/blogReviewCount/rating/photoCount). 필드 못 찾으면 해당 값 `null`, `raw`에는 원본 그대로.
- 파싱/네트워크 실패 시 `throw` (호출부 catch가 graceful degradation 담당).

**`fetchKeywordRank(keyword, myPlaceId): Promise<KeywordRankResult>`** — LOW 신뢰도.
- 엔드포인트: `https://map.naver.com/p/api/search/allSearch` (RESEARCH §3 검증됨).
- params: `query=keyword`, `type=all`. 헤더 `Referer: https://map.naver.com/p/search/{encodeURIComponent(keyword)}`.
- 응답 `result.place.list` 순회 → 오가닉 rank 카운트(광고 제외), `id === myPlaceId` 매칭 시 rank/isAd/total 반환.
- 미발견 → `rank: null` (sentinel 금지, D 도메인 규칙). 수집 실패 → `throw`.

### 완료 검증 기준

- [ ] `lib/naver-place.ts` export: `parsePlaceId`, `fetchPlaceInfo`, `fetchKeywordRank`, `resolveShortUrl` + 3개 타입
- [ ] `parsePlaceId('https://m.place.naver.com/restaurant/1085956231/home')` → `{ placeId: '1085956231', type: 'restaurant' }`
- [ ] `parsePlaceId('https://map.naver.com/p/entry/place/1085956231')` → `placeId: '1085956231'`
- [ ] `parsePlaceId('1085956231')` → `placeId: '1085956231', type: 'unknown'`
- [ ] `parsePlaceId('https://naver.com/없음')` → throw
- [ ] `tsc --noEmit` 통과, `any` 미사용(전역 규칙), 함수 30줄 이하
- [ ] fetch 계열 함수: 네트워크 실패 시 throw (try/catch는 호출부)

### 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| GraphQL operation/필드 변경 | **높음** (LOW 신뢰도) | 격리 설계 — 이 파일만 수정. register는 graceful degrade로 계속 동작 |
| allSearch 응답 구조 상이(isAd vs ad) | 높음 | 두 필드 모두 체크. 실패 시 throw → rank null로 degrade |
| Vercel/네이버 IP 차단 | 중 | 소량 수집은 헤더만 정확하면 가능. 차단 시 fetch_failed로 표면화 |
| 단축 URL 리다이렉트 무한루프 | 낮음 | resolveShortUrl 1회만 follow, 결과 재파싱 |

---

## Task 3 — API Routes (`app/api/place/`)

| 항목 | 내용 |
|------|------|
| **파일** | `app/api/place/register/route.ts`, `keywords/route.ts`, `snapshots/route.ts`, `rankings/route.ts` (모두 신규) |
| **의존성** | Task 1 (테이블) + Task 2 (함수) — Wave 2 |
| **예상 컨텍스트** | ~30% (4개 라우트, 각 단순) |

### 공통 패턴 (D-03 — community/posts 기준, 모든 파일 상단)

```
export const dynamic = 'force-dynamic'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
const db = supabaseAdmin as any        // 쓰기
const dbRead = supabaseAdminCached as any  // 읽기 목록
```

req/res 스키마는 RESEARCH_db_api.md §2 **그대로**.

### `register/route.ts`

- **POST** `{ place_url }` → `{ registration, snapshot, fetch_failed? }`
  1. `naver.me` 감지 시 `resolveShortUrl` 먼저, 그 후 `parsePlaceId` → 실패 시 400 (구체적 메시지: "올바른 네이버 플레이스 URL이 아닙니다")
  2. `fetchPlaceInfo(placeId)` **try/catch** — 실패해도 진행 (D-05 graceful degradation)
  3. `puzl_place_registrations` upsert (`onConflict: 'user_id,naver_place_id'`). name = fetch 성공 시 실제값, 실패 시 `플레이스 ${placeId}` 임시값
  4. fetch 성공 시에만 `puzl_place_snapshots` upsert (`onConflict: 'registration_id,snapshot_date'`)
  5. fetch 실패 시 `snapshot:null, fetch_failed:true` 반환
- **GET** → 등록 목록 + 각 최신 snapshot. `dbRead`, `eq('user_id', DEMO_USER_ID)`. 응답 헤더 `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`. 최신 snapshot은 registration별 `snapshot_date desc limit 1`.

### `keywords/route.ts`

- **POST** `{ registration_id, keyword }` → `{ keyword }`. 빈 문자열 400, unique 위반(`23505`) → 409 ("이미 등록된 키워드입니다")
- **DELETE** `?id={keyword_id}` → `{ ok: true }`
- **GET** `?registration_id={id}` → 키워드 목록 + 최신 순위(`KeywordWithRank[]`). 각 키워드의 `puzl_keyword_rankings` 최신 1건 조인.

### `snapshots/route.ts`

- **GET** `?registration_id={id}&days=30` → `{ registration_id, days, snapshots[] }`. `gte('snapshot_date', N일전)`, `order snapshot_date asc` (그래프용).

### `rankings/route.ts`

- **GET** `?registration_id={id}&days=30` → `{ registration_id, days, series[] }`.
  1. registration의 활성 키워드 조회
  2. 각 keyword_id의 N일치 rankings (`snapshot_date asc`)
  3. 키워드별 그룹핑 → `series[].points[]` (page.tsx TREND_DATA.series 직매핑)

### 완료 검증 기준

- [ ] 4개 route 파일 존재, 모두 `force-dynamic` + `supabaseAdmin as any` + `DEMO_USER_ID` 패턴
- [ ] **ad-accounts 패턴(anon 클라이언트, 문자열 demo-user-001, 목 fallback) 미사용** 확인
- [ ] `POST /api/place/register` 유효 URL → 201, registration 반환 (네이버 fetch 실패해도 등록 성공 + `fetch_failed:true`)
- [ ] `POST /api/place/register` 잘못된 URL → 400
- [ ] `GET /api/place/register` → 배열 반환, Cache-Control 헤더 존재
- [ ] `POST /api/place/keywords` 중복 → 409
- [ ] `DELETE /api/place/keywords?id=` → `{ ok: true }`
- [ ] `GET /api/place/snapshots?registration_id=&days=30` → snapshots asc 정렬
- [ ] `GET /api/place/rankings?registration_id=&days=30` → series 키워드별 그룹
- [ ] `tsc --noEmit` 통과, `any`는 클라이언트 캐스팅만 (전역 규칙 예외 — 기존 표준 패턴)

### 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| upsert onConflict 컬럼명 오타 | 중 | Task 1 unique 제약명과 정확히 일치 확인 |
| register fetch 실패 시 row 미저장 | 중 | try/catch 순서 — 등록 upsert는 fetch try 밖에서 실행 |
| GET 목록 N+1 (각 registration별 snapshot 쿼리) | 낮음 | 데모 단일 유저·소량. 추후 단일 쿼리 최적화 가능 |

---

## Task 4 — UI 연동 (`app/(app)/place/page.tsx`)

| 항목 | 내용 |
|------|------|
| **파일** | `app/(app)/place/page.tsx` (수정) |
| **의존성** | Task 3 (API) — Wave 3 |
| **예상 컨텍스트** | ~30% (목업→실데이터 전환 + 등록 모달 + 키워드 UI) |

### 구현 포인트 (RESEARCH §4 매핑표 기준)

1. **데이터 로딩**: 클라 컴포넌트(`'use client'`)이므로 `useEffect + fetch`. 프로젝트에 SWR 없으면 useEffect 패턴 사용 (확인 필요). 로딩 중 **스켈레톤 UI** (전역 규칙 — 스피너 단독 금지). 기존 카드 레이아웃 형태의 회색 박스 스켈레톤.
2. **실데이터 연동 (스코프 내)**:
   - 가게 정보 바 (L166-186): `GET /api/place/register` 첫 항목 → name/address/category
   - 키워드 순위 패널 (L189-223, `KEYWORDS`): `GET /api/place/keywords?registration_id=` → rank/signal/trend/delta. signal은 최신 rank 임계값 산출(green<10, yellow<20, red≥20). trend/delta는 직전 스냅샷 대비.
   - 순위 변동 그래프 (L376-467, `TREND_DATA`): `GET /api/place/rankings?days=30` → labels(snapshot_date를 M/D 변환), series.ranks. rank=null은 line break 처리.
3. **플레이스 등록 모달** (신규): 등록된 플레이스 없을 때 노출. 네이버 URL 입력 → `POST /api/place/register`. 성공 시 목록 리프레시. `fetch_failed:true` 시 "기본정보 수집 대기중" 안내 표시.
4. **키워드 추가/삭제 UI** (신규): 키워드 패널에 입력+추가 버튼 → `POST /api/place/keywords`. 각 키워드 카드에 삭제 → `DELETE /api/place/keywords?id=`. 추가/삭제 후 리프레시.
5. **handleRefresh** (L117-126): 목 setTimeout → `POST /api/place/register`(재수집) 호출로 교체. 등록 placeId로 재등록(upsert) 트리거.
6. **범위 밖 — 목업 유지 + 주석**:
   - `COMPETITORS` (L64-70), 경쟁자 분석 섹션 (L296-373): 상단에 `{/* 후속 페이즈: 경쟁자 데이터 모델 별도 — 현재 목업 */}` 주석
   - `CHECKLIST` (L56-62), 진단 체크리스트 (L227-294), 점수 62/100: `{/* 후속 페이즈: 진단 로직 별도 — 현재 목업 */}` 주석
7. **디자인 시스템**: 기존 `#0066cc` 하드코딩은 그대로 따라가되(기존 코드 일관성), 신규 추가 요소는 CSS 변수/토큰 권장. border-radius/shadow는 기존 카드(`rounded-xl border-gray-100 shadow-sm`) 계층 따름.

### 완료 검증 기준

- [ ] `useEffect`로 register/keywords/rankings 3개 API 호출, 목업 상수 대신 state 사용
- [ ] 로딩 상태 = 스켈레톤 UI (스피너 단독 아님)
- [ ] 플레이스 등록 모달: URL 입력 → POST → 목록 갱신 동작
- [ ] `fetch_failed` 시 "기본정보 수집 대기중" 표시
- [ ] 키워드 추가/삭제 버튼 → API 호출 → 갱신
- [ ] COMPETITORS/CHECKLIST 섹션에 "후속 페이즈" 주석 존재, 목업 유지
- [ ] `npm run build` 성공, 콘솔 에러 없음
- [ ] 빈 catch 블록 없음, console.log 미잔존 (전역 규칙)
- [ ] 등록 플레이스 0건일 때 빈 상태(등록 유도) 정상 렌더

### 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| rank=null 차트 렌더 깨짐 | 중 | yFor에서 null 스킵, polyline 분절 처리 |
| SWR 미설치인데 가정 | 중 | 구현 전 `package.json` 확인 → 없으면 useEffect |
| 네이버 fetch 항상 실패 시 빈 화면 | 중 | graceful degrade UI(수집 대기중)로 의미 있는 상태 표시 |
| 그래프 geometry 기존 로직 깨짐 | 낮음 | 기존 yFor/xFor 유지, 데이터 소스만 교체 |

---

## 전체 검증 (Phase 완료 기준)

- [ ] 4개 Task 각각 원자적 커밋
- [ ] 마이그레이션 `nbfoifegbamvtwffbuxv`에 적용, 4개 테이블 확인
- [ ] `npm run build` 성공
- [ ] place 페이지: 등록→키워드 추가→순위/추이 표시 흐름 동작 (네이버 fetch 실패 시에도 등록/UI는 graceful degrade)
- [ ] COMPETITORS/CHECKLIST/스케줄러는 범위 밖 — 목업 유지 + 주석 확인
- [ ] 전역 규칙 준수: 이모지 없음, 슬롭 단어 없음, 함수 30줄 이하, any 최소(표준 캐스팅만), console.log 제거

## 후속 페이즈 (이번 범위 밖 — 설계만)

1. **자동 수집 스케줄러** (RESEARCH §5): Railway 크론잡 또는 Vercel Cron. 매일 1회 등록 플레이스×키워드 순위/기본정보 수집 → snapshots/rankings 저장. `unique(..., snapshot_date)`가 멱등 보장.
2. **경쟁자 분석** (COMPETITORS): 키워드 검색 상위 N개 플레이스 수집 테이블 신규 필요.
3. **진단 체크리스트** (CHECKLIST): snapshot 필드(사진/리뷰수) 일부 유도 + 별도 진단 로직.
