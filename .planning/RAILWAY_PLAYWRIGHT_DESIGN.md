# RAILWAY PLAYWRIGHT DESIGN — 네이버 키워드 순위 수집 크론잡

작성일: 2026-06-20
상태: 설계 명세 (코드 구현 아님)

## 배경

Vercel/데이터센터 IP에서 네이버 `allSearch` 호출 시 `ncaptcha`로 차단된다.
`searchCoord`를 붙여도 서버 IP는 봇으로 탐지된다. 따라서 실운영 키워드 순위 수집은
residential 성격의 headless 브라우저 환경(Railway)에서 Playwright로 수행한다.

Next.js 앱의 `lib/naver-place.ts:fetchKeywordRank`는 로컬/개발 폴백으로만 남기고,
프로덕션 순위 데이터는 본 크론잡이 `puzl_keyword_rankings`에 채운다.

## 아키텍처

```
Railway Cron Service (Python + Playwright)
  ├─ 03:00 KST 트리거
  ├─ Supabase에서 활성 키워드 조회 (puzl_place_keywords JOIN registrations)
  ├─ 키워드별 네이버 지도 검색 → DOM에서 순위 추출
  └─ puzl_keyword_rankings upsert (onConflict: keyword_id,snapshot_date)
```

## 환경 구성

- 런타임: Python 3.12
- 의존성: `playwright`, `supabase` (python client), `python-dotenv`
- 브라우저: `playwright install chromium --with-deps`
- Railway 서비스 타입: Cron (스케줄드 잡)
- Dockerfile 권장 (playwright 시스템 의존성 설치 필요)

## 크론 스케줄

- `0 18 * * *` UTC = 03:00 KST 매일 1회
- Railway Cron Schedule 설정란에 등록
- 타임아웃: 키워드 수 × 8초 + 여유. 100개 키워드 기준 약 15분 상한.

## 입력 — Supabase 조회

```sql
select
  k.id        as keyword_id,
  k.keyword   as keyword,
  r.naver_place_id as place_id
from puzl_place_keywords k
join puzl_place_registrations r on r.id = k.registration_id
where k.is_active = true
  and r.is_active = true;
```

## 실행 — 키워드별 순위 추출

1. `https://m.place.naver.com/search?query={keyword}` 또는
   `https://map.naver.com/p/search/{keyword}` 진입
2. 검색 결과 리스트 DOM이 렌더될 때까지 대기 (`page.wait_for_selector`)
3. 결과 항목을 위→아래 순회하며:
   - 광고 배지(ad marker) 항목은 isAd=true, 오가닉 카운트에서 제외
   - 항목의 placeId(링크 href 또는 data 속성)가 내 place_id와 일치하면 현재 오가닉 순위 확정
4. 미노출이면 rank=null
5. 요청 간 1~3초 랜덤 지연(레이트 리밋 회피), UA 로테이션

추출값: `rank`, `is_ad`, `total_results`, `raw_data`(원본 DOM/JSON 스냅샷)

## 출력 — Supabase upsert

```python
supabase.table("puzl_keyword_rankings").upsert({
    "keyword_id": keyword_id,
    "snapshot_date": today_kst,      # date
    "rank": rank,                    # int | None
    "is_ad": is_ad,                  # bool
    "total_results": total_results,  # int | None
    "raw_data": raw_snapshot,        # jsonb
}, on_conflict="keyword_id,snapshot_date").execute()
```

unique(keyword_id, snapshot_date) 제약과 일치 → 동일자 재실행 시 덮어쓰기.

## Railway 환경 변수

| 변수명 | 용도 |
|---|---|
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_SERVICE_ROLE_KEY | RLS 우회 서버 키 (rankings upsert) |
| TZ | `Asia/Seoul` (snapshot_date 계산 일관성) |
| PLAYWRIGHT_HEADLESS | `true` |
| RATE_LIMIT_MIN_MS / RATE_LIMIT_MAX_MS | 키워드 간 지연 범위 |
| USER_AGENT_POOL | 로테이션용 UA 목록(쉼표 구분, 선택) |

## 운영 고려사항

- 차단 감지: 응답에 `ncaptcha`/캡차 DOM 출현 시 해당 잡 실패 기록 + 알림.
  잦으면 Railway 리전 변경 또는 residential 프록시 도입 검토.
- 부분 실패 허용: 키워드 단위 try/except, 한 키워드 실패가 전체를 중단시키지 않음.
- 멱등성: snapshot_date upsert로 재실행 안전.
- 관측성: 잡 종료 시 성공/실패/미노출 카운트를 stdout 로그로 남김.

## Next.js 앱과의 경계

- 앱은 `puzl_keyword_rankings`를 read-only로 조회해 대시보드 표시.
- 앱의 `fetchKeywordRank`는 개발/로컬 검증 폴백. 프로덕션 데이터 출처 아님.
- 본 크론잡이 단일 진실 공급원(순위 한정).
