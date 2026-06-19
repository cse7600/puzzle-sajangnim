# 네이버 플레이스 모니터링 — DB 스키마 + API 설계 리서치

**작성일:** 2026-06-19
**도메인:** Supabase Postgres 스키마 + Next.js 14 App Router API + 네이버 플레이스 비공식 데이터 수집
**전체 신뢰도:** MEDIUM (DB/API 설계는 HIGH — 기존 코드 확인 완료 / 네이버 GraphQL 호출은 LOW — 비공식·변동성)

## 요약

기존 코드베이스 패턴은 명확하다. 마이그레이션은 `migrations/00X_*.sql`, 신규 기능 테이블은 `puzl_` 프리픽스, RLS는 켜되 정책은 거의 없음(`select using (true)` 수준), **DB 트리거는 전혀 사용하지 않음**(updated_at은 코드에서 수동 세팅). API route는 `export const dynamic='force-dynamic'` + `supabaseAdmin as any` + `DEMO_USER_ID` 패턴이 표준이다. `migrations/005_place_monitoring.sql`과 `app/api/place/*` 라우트를 이 패턴 그대로 추가하면 된다.

리스크는 네이버 플레이스 데이터 수집 한 곳에 집중된다. 네이버는 공식 플레이스 정보 API를 제공하지 않으며, 실서비스가 쓰는 내부 GraphQL 엔드포인트(`pcmap-api.place.naver.com/graphql` 계열)는 비공개·무문서이고 operation/필드/헤더가 수시로 바뀐다. `lib/naver-place.ts`로 이 호출을 완전히 격리하고, 실패 시 안전하게 degrade하도록 설계해야 한다.

**Primary recommendation:** 4개 테이블 DDL을 005 마이그레이션으로 추가하고, 네이버 호출 전부를 `lib/naver-place.ts`에 가두며, 모든 fetch 로직은 try/catch로 감싸 실패 시 등록은 성공시키되 snapshot은 비워두는 graceful degradation을 적용한다.

## 핵심 컨벤션 (코드 확인 완료) [VERIFIED: 코드베이스 grep/read]

| 항목 | 패턴 | 근거 |
|------|------|------|
| 마이그레이션 번호 | 다음은 `005` | `migrations/` 에 001~004 존재 |
| 테이블 프리픽스 | 신규 기능 = `puzl_` | 003의 `puzl_community_posts` 등 |
| user_id | `DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'` (UUID) | `lib/auth.ts` |
| RLS | `enable row level security` + `select using(true)` 만 | 001 라인 113~123 |
| **트리거** | **없음. updated_at은 코드에서 수동** | 전체 마이그레이션에 trigger/moddatetime 0건 |
| UUID 기본값 | `uuid_generate_v4()` 또는 `gen_random_uuid()` 혼용 | 001 vs 003 |
| 인덱스 | `create index if not exists idx_{table}_{col}` | 003 라인 16~17 |
| API route 헤더 | `export const dynamic = 'force-dynamic'` 최상단 | community/posts/route.ts |
| 쓰기 클라이언트 | `const db = supabaseAdmin as any` | community/posts/route.ts:8 |
| 읽기(목록) 클라이언트 | `const dbRead = supabaseAdminCached as any` (30s 캐시) | community/posts/route.ts:9 |
| 응답 캐시 헤더 | GET 목록은 `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` | community/posts/route.ts:67 |
| 타입 우회 | 신규 테이블은 `as any`, `types/database.ts` 수정 불필요 | 메시지 명시 + 코드 확인 |

> 주의: `app/api/ad-accounts/route.ts`는 구식 패턴(`supabase` anon 클라이언트 + `DEMO_USER_ID='demo-user-001'` 문자열 + 목 데이터 fallback)을 쓴다. **이 패턴을 따르지 말 것.** community/posts/route.ts가 최신 표준이다.

---

## 1. 테이블 DDL 초안 — `migrations/005_place_monitoring.sql`

```sql
-- ============================================================
-- Migration 005: 네이버 플레이스 모니터링
-- 등록 플레이스 / 키워드 / 일별 기본정보 스냅샷 / 일별 키워드 순위
-- 트리거 미사용 — updated_at은 애플리케이션 코드에서 수동 세팅
-- user_id = DEMO_USER_ID (lib/auth.ts), 운영 전환 시 auth 연동으로 교체
-- ============================================================

-- 1) 등록된 네이버 플레이스
create table if not exists public.puzl_place_registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  naver_place_id text not null,            -- 네이버 placeId (예: '1085956231')
  place_url text not null,                  -- 사용자가 입력한 원본 URL
  name text not null,
  address text,
  category text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, naver_place_id)
);

create index if not exists idx_puzl_place_reg_user on public.puzl_place_registrations(user_id);

-- 2) 모니터링 키워드
create table if not exists public.puzl_place_keywords (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references public.puzl_place_registrations(id) on delete cascade not null,
  keyword text not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  unique(registration_id, keyword)
);

create index if not exists idx_puzl_place_kw_reg on public.puzl_place_keywords(registration_id);

-- 3) 일별 기본정보 스냅샷
create table if not exists public.puzl_place_snapshots (
  id uuid default uuid_generate_v4() primary key,
  registration_id uuid references public.puzl_place_registrations(id) on delete cascade not null,
  snapshot_date date not null default current_date,
  review_count integer,
  visitor_review_count integer,
  blog_review_count integer,
  rating numeric(3,2),                      -- 0.00 ~ 5.00
  photo_count integer,
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(registration_id, snapshot_date)
);

create index if not exists idx_puzl_place_snap_reg_date
  on public.puzl_place_snapshots(registration_id, snapshot_date desc);

-- 4) 일별 키워드 순위 스냅샷
create table if not exists public.puzl_keyword_rankings (
  id uuid default uuid_generate_v4() primary key,
  keyword_id uuid references public.puzl_place_keywords(id) on delete cascade not null,
  snapshot_date date not null default current_date,
  rank integer,                             -- null = 순위권 밖(미노출)
  is_ad boolean default false not null,
  total_results integer,
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(keyword_id, snapshot_date)
);

create index if not exists idx_puzl_kw_rank_kw_date
  on public.puzl_keyword_rankings(keyword_id, snapshot_date desc);

-- RLS (기존 패턴: 켜되 전체 read 허용)
alter table public.puzl_place_registrations enable row level security;
alter table public.puzl_place_keywords enable row level security;
alter table public.puzl_place_snapshots enable row level security;
alter table public.puzl_keyword_rankings enable row level security;

create policy "puzl_place_registrations_select" on public.puzl_place_registrations for select using (true);
create policy "puzl_place_keywords_select" on public.puzl_place_keywords for select using (true);
create policy "puzl_place_snapshots_select" on public.puzl_place_snapshots for select using (true);
create policy "puzl_keyword_rankings_select" on public.puzl_keyword_rankings for select using (true);
```

### DDL 설계 결정 사항
- **updated_at 트리거 미생성**: 코드베이스에 트리거가 0건. `puzl_place_registrations`만 updated_at을 가지며, 등록정보 수정 API에서 `updated_at: new Date().toISOString()`을 명시적으로 set. 나머지 3개 테이블은 append-only(일별 스냅샷)라 updated_at 불필요 → created_at만 둠.
- **rating은 `numeric(3,2)`**: 0.00~5.00 표현. 001의 `payback_rate numeric(4,2)`와 일관.
- **rank/순위 관련 정수는 nullable**: rank=null은 "순위권 밖"이라는 도메인 의미를 가짐(목업의 28위 초과 케이스). 별도 sentinel 값 쓰지 말 것.
- **raw_data jsonb**: 네이버 응답 원본 보관 → 추후 필드 추가 시 재수집 없이 백필 가능. 001의 `receipts.ocr_data jsonb`와 동일 전략.
- **복합 인덱스 `(registration_id, snapshot_date desc)`**: 추이 조회(`GET ...?days=30`)가 핵심 쿼리라 정확히 이 순서로 인덱싱.

[VERIFIED: 기존 마이그레이션 스타일 일치 확인]

---

## 2. API Route req/res 스키마 (TypeScript)

신규 디렉토리 `app/api/place/` 생성 필요(현재 없음). 모든 라우트 상단:

```typescript
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
const db = supabaseAdmin as any
const dbRead = supabaseAdminCached as any
```

### 공통 타입

```typescript
interface PlaceRegistration {
  id: string
  user_id: string
  naver_place_id: string
  place_url: string
  name: string
  address: string | null
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PlaceSnapshot {
  id: string
  registration_id: string
  snapshot_date: string        // 'YYYY-MM-DD'
  review_count: number | null
  visitor_review_count: number | null
  blog_review_count: number | null
  rating: number | null
  photo_count: number | null
  created_at: string
}

interface KeywordRanking {
  id: string
  keyword_id: string
  snapshot_date: string
  rank: number | null          // null = 순위권 밖
  is_ad: boolean
  total_results: number | null
  created_at: string
}
```

### `app/api/place/register/route.ts`

```typescript
// POST — 플레이스 URL 등록
interface RegisterRequest {
  place_url: string            // 'https://m.place.naver.com/restaurant/1085956231' 등
}
interface RegisterResponse {
  registration: PlaceRegistration
  snapshot: PlaceSnapshot | null   // 네이버 fetch 실패 시 null (등록은 성공)
  fetch_failed?: boolean
}
// 흐름:
// 1) parsePlaceId(place_url) → naver_place_id (실패 시 400)
// 2) fetchPlaceInfo(naver_place_id) try/catch
// 3) upsert puzl_place_registrations (onConflict user_id,naver_place_id)
// 4) 성공 시 upsert puzl_place_snapshots (snapshot_date=오늘)

// GET — 등록 목록 + 각 플레이스 최신 snapshot
interface RegisterListItem extends PlaceRegistration {
  latest_snapshot: PlaceSnapshot | null
}
type RegisterListResponse = RegisterListItem[]
// dbRead 사용, eq('user_id', DEMO_USER_ID), Cache-Control 30s
// 최신 snapshot: 각 registration에 대해 snapshot_date desc limit 1
```

### `app/api/place/keywords/route.ts`

```typescript
// POST — 키워드 추가
interface AddKeywordRequest {
  registration_id: string
  keyword: string
}
interface AddKeywordResponse {
  keyword: { id: string; registration_id: string; keyword: string; is_active: boolean; created_at: string }
}
// 빈 문자열/중복(unique 위반 23505) 처리 → 409

// DELETE /api/place/keywords?id={keyword_id}
interface DeleteKeywordResponse { ok: true }

// GET /api/place/keywords?registration_id={id} — 키워드 목록 + 최신 순위
interface KeywordWithRank {
  id: string
  keyword: string
  is_active: boolean
  latest_rank: number | null
  latest_is_ad: boolean
  rank_snapshot_date: string | null
}
type KeywordListResponse = KeywordWithRank[]
```

### `app/api/place/snapshots/route.ts`

```typescript
// GET /api/place/snapshots?registration_id={id}&days=30
interface SnapshotTrendResponse {
  registration_id: string
  days: number
  snapshots: PlaceSnapshot[]   // snapshot_date asc, 그래프용
}
// gte('snapshot_date', N일 전), order snapshot_date asc
```

### `app/api/place/rankings/route.ts`

```typescript
// GET /api/place/rankings?registration_id={id}&days=30
interface RankingSeries {
  keyword_id: string
  keyword: string
  points: { snapshot_date: string; rank: number | null; is_ad: boolean }[]
}
interface RankingTrendResponse {
  registration_id: string
  days: number
  series: RankingSeries[]       // 키워드별 시계열 — page.tsx TREND_DATA.series 직매핑
}
// 1) registration_id의 활성 키워드 조회
// 2) 각 keyword_id의 N일치 rankings (snapshot_date asc)
// 3) 키워드별 그룹핑
```

[VERIFIED: 기존 community/posts/route.ts 패턴 기반 / 응답 구조는 page.tsx 목업과 매핑 확인]

---

## 3. `lib/naver-place.ts` 함수 시그니처

```typescript
// 네이버 플레이스 비공식 데이터 수집 — 전부 이 파일에 격리
// 경고: 네이버 내부 GraphQL은 비공개/무문서. operation/필드/헤더가 수시 변경됨.
// 모든 호출은 호출부에서 try/catch. 실패는 등록/스냅샷을 막지 않는다.

export interface ParsedPlace {
  placeId: string
  type: 'restaurant' | 'place' | 'hairshop' | 'hospital' | 'unknown'
}

export interface PlaceBasicInfo {
  name: string
  address: string | null
  category: string | null
  reviewCount: number | null
  visitorReviewCount: number | null
  blogReviewCount: number | null
  rating: number | null
  photoCount: number | null
  raw: unknown                 // 원본 응답 → snapshots.raw_data
}

export interface KeywordRankResult {
  rank: number | null          // null = 순위권 밖(미노출)
  isAd: boolean
  totalResults: number | null
  raw: unknown
}

/**
 * 플레이스 URL/단축URL에서 placeId 추출.
 * 지원 포맷:
 *   https://m.place.naver.com/restaurant/1085956231/...
 *   https://map.naver.com/p/entry/place/1085956231
 *   https://naver.me/xxxx (단축 → 리다이렉트 follow 필요, 별도 처리)
 *   '1085956231' (순수 ID)
 * @throws URL에서 ID를 못 찾으면 Error
 */
export function parsePlaceId(input: string): ParsedPlace

/**
 * placeId로 기본정보 조회 (네이버 내부 GraphQL).
 * @throws 네트워크/파싱 실패 시 Error — 호출부에서 catch
 */
export async function fetchPlaceInfo(placeId: string): Promise<PlaceBasicInfo>

/**
 * 키워드 검색 결과에서 내 placeId의 순위 탐색.
 * @returns 미노출이면 rank=null. @throws 수집 실패 시 Error
 */
export async function fetchKeywordRank(
  keyword: string,
  myPlaceId: string,
): Promise<KeywordRankResult>
```

### naver-place.ts 구현 가이드
- `parsePlaceId`는 정규식 기반, **네트워크 불필요**(단축 URL 제외) → 단위 테스트 쉬움. 우선 구현·검증.
- `fetchPlaceInfo` / `fetchKeywordRank`는 네이버 내부 GraphQL POST. 필요한 헤더(검증 필요): `Referer: https://m.place.naver.com/`, 모바일 `User-Agent`, 경우에 따라 `x-wtm-graphql`. **이 값들은 LOW confidence — 구현 시점에 실제 네트워크 탭으로 재확인 필수.**
- fetch 타임아웃(예: 8s) + 1회 재시도. raw 응답은 항상 `raw` 필드로 그대로 반환해 snapshot에 저장.

---

## 4. 목업 → 실데이터 매핑표 (`app/(app)/place/page.tsx`)

| page.tsx 목업 상수 | 위치 | 대체 소스 | 비고 |
|---|---|---|---|
| `KEYWORDS[]` (keyword, rank, trend, delta) | L50-54 | `GET /api/place/keywords?registration_id=` + `GET /api/place/rankings` | rank=최신순위. trend/delta=직전 스냅샷 대비 계산(클라/서버) |
| `TREND_DATA.labels` | L74 | rankings 응답의 `snapshot_date[]` | `M/D` 포맷 변환 |
| `TREND_DATA.series[].ranks` | L75-79 | `RankingTrendResponse.series[].points[].rank` | rank=null → 차트에서 line break 또는 maxRank 처리 |
| `TREND_DATA.series[].name/color` | L76-78 | keyword명 / 신호색은 최신 rank 임계값으로 산출 | 색=signal(green<10, yellow<20, red≥20) 규칙화 권장 |
| 가게 정보 바: '을지로 쌈밥 철수네' | L169 | `RegisterListItem.name` | |
| 주소 '서울 중구 을지로 123' | L173 | `.address` | |
| '한식 / 쌈밥' | L177 | `.category` | |
| `COMPETITORS[]` (경쟁자 분석) | L64-70 | **이번 스코프 밖** | 4개 테이블에 경쟁자 데이터 없음. 별도 수집 필요 → 5번 리스크 참조. 당분간 목업 유지 |
| `CHECKLIST[]` (개선 진단) | L56-62 | **이번 스코프 밖** | snapshot 필드로 일부 유도 가능(사진/리뷰수)이나 항목 대부분은 별도 로직. 목업 유지 |
| 진단 점수 62/100 | L232 | **이번 스코프 밖** | 위와 동일 |
| 리뷰수/사진/평점 격차 | L366-371 | COMPETITORS 의존 → 스코프 밖 | |
| `handleRefresh` (목 setTimeout) | L117-126 | `POST /api/place/register`(재수집) 또는 별도 refresh 엔드포인트 | 현재는 클라 setTimeout 흉내만 |

**스코프 명확화:** 4개 테이블은 (1) 내 플레이스 기본정보 추이 (2) 내 키워드 순위 추이 만 커버한다. **경쟁자 테이블(COMPETITORS)과 진단 체크리스트(CHECKLIST)는 데이터 모델에 없으므로 이번 마이그레이션 범위 밖**이다. 해당 UI 섹션은 목업으로 남기거나 후속 페이즈로 분리할 것. 이 점을 plan 단계에서 반드시 사용자에게 확인.

---

## 5. 구현 시 주의점 / 리스크

### [HIGH 리스크] 네이버 비공식 데이터 수집
- **공식 API 없음.** 플레이스 정보/순위 공식 오픈 API는 존재하지 않음 [VERIFIED: 검색 — 네이버 공식은 검색/지오코딩 API만, 플레이스 상세는 비공개]. 내부 GraphQL은 무문서·변동성 큼 [CITED: scrapfly/apify/velog 다수 — "selector를 일정 기간 지나면 바꿈"].
- **격리 원칙:** 모든 네이버 호출을 `lib/naver-place.ts`에만 둔다. 깨질 때 한 파일만 고치면 되도록.
- **graceful degradation:** `register` POST에서 fetch 실패해도 등록 row는 저장(name은 URL/placeId 임시값). snapshot은 null로 두고 `fetch_failed:true` 반환. UI는 "기본정보 수집 대기중" 표시.
- **순위 미노출:** rank=null이 정상 도메인 값. 0이나 999 같은 sentinel 쓰지 말 것.
- **차단/레이트리밋:** 키워드 순위 수집은 검색 페이지 호출이라 차단 위험 높음. 일별 1회(`unique(keyword_id, snapshot_date)`가 이를 강제)로 제한, 키워드 간 딜레이.

### [MEDIUM] URL 파싱 다양성
- `m.place.naver.com/restaurant/{id}`, `map.naver.com/p/entry/place/{id}`, `naver.me/단축` [VERIFIED: m.place URL 포맷 / 단축 URL은 리다이렉트 follow 필요]. `parsePlaceId`가 여러 포맷 + 순수 숫자 입력을 받도록. 단축 URL은 HEAD/GET 리다이렉트 추적 별도 처리.

### [MEDIUM] 데모 단일 유저 / auth 미연동
- 모든 라우트 `DEMO_USER_ID` 하드코딩. `unique(user_id, naver_place_id)` 덕에 데모에서도 멱등. 운영 전환 시 user_id 소스만 교체.

### [LOW] upsert / 멱등성
- snapshot/ranking은 `unique(..., snapshot_date)` + `upsert(onConflict)`로 일 1회 멱등 보장. 같은 날 재수집은 덮어쓰기.
- 키워드 중복 추가 시 Postgres `23505` 코드 분기 → 409.

### [LOW] 트리거 부재 주의
- updated_at 자동 갱신 트리거 없음. registration 수정 API에서 `updated_at` 수동 set 잊지 말 것.

### [참고] 데이터 수집 스케줄러
- "1일 1회 자동 수집"(page.tsx L292)을 실제로 돌리려면 cron이 필요(Vercel Cron / Supabase pg_cron / 외부). 이번 스코프는 스키마+API+수동 트리거(register)까지. 자동 수집 스케줄러는 후속 페이즈. plan 시 분리 권고.

---

## 출처

### MEDIUM (검증됨)
- m.place.naver.com URL 포맷 `/place/{placeId}`, placeId 단독 사용 가능 — Apify Naver Map Scraper, scrapfly
- 네이버 플레이스 = Apollo State + GraphQL, 커서 페이지네이션 — apify/scrapfly 다수
- 공식 플레이스 상세 API 부재(검색/지오코딩만 공식) — NAVER Cloud / navermaps GitHub

### LOW (구현 시 재검증 필수)
- 정확한 GraphQL endpoint/operation/헤더(`x-wtm-graphql` 등) — 공개 문서 없음. 구현 시점 네트워크 탭 직접 확인 필요
- velog 한국어 사례 다수 — "네이버가 selector/UI 주기적 변경" (변동성 근거)

### VERIFIED (코드베이스)
- migrations/001,003,004, community/posts·ad-accounts route.ts, lib/auth.ts, lib/supabase-admin.ts, place/page.tsx — 직접 read

## 메타데이터
- **신뢰도:** DB 스키마 HIGH / API 설계 HIGH / 네이버 수집 LOW
- **유효기간:** DB·API 패턴 30일+ / 네이버 GraphQL 부분 7일 (변동성)
