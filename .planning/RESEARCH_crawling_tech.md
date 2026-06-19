# 네이버 플레이스 크롤링 기술 조사 리포트

작성일: 2026-06-19  
목적: 퍼즐 사장님 프로젝트 — 네이버 플레이스 모니터링 시스템 기술 스택 확정

---

## 1. 네이버 플레이스 GraphQL Endpoint 검증

### 검증된 Endpoint

| Endpoint | 용도 | 신뢰도 |
|----------|------|--------|
| `https://map.naver.com/p/api/search/allSearch` | 키워드 검색 → 장소 목록 | 검증됨 (velog 사례) |
| `https://api.place.naver.com/graphql` | 장소 상세정보 (리뷰/별점/사진 등) | 업계 관행 확인 |
| `https://pcmap-api.place.naver.com/graphql` | 장소 상세정보 (추정 동일 계열) | 추정 |
| `https://pcmap.place.naver.com/place/{sid}` | 장소 상세 페이지 (HTML) | 검증됨 |

> **중요**: `api.place.naver.com/graphql`과 `pcmap-api.place.naver.com/graphql`은 네이버 플레이스 모바일앱이 사용하는 동일 내부 API 계열이다. Apify actor 제작자들이 이 endpoint를 사용하여 stable한 데이터 수집을 확인했다.

### 필수 HTTP 헤더

```python
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://map.naver.com/p/search/{encoded_keyword}",
    "Content-Type": "application/json",
    "Origin": "https://map.naver.com",
}
```

- `ua_generator` 라이브러리로 동적 User-Agent 생성 권장
- Referer가 핵심: `https://map.naver.com/p/search/` + 인코딩된 키워드

### GraphQL Query 구조 (추정)

네이버 플레이스 GraphQL의 operationName은 공개 문서화되어 있지 않다.  
DevTools Network 탭 → XHR 필터 → `graphql` 요청 추적으로 현재 스키마 확인 필요.

알려진 operationName 패턴:
- `getPlaceMain` — 장소 기본정보 (추정)
- `getReviews` — 리뷰 목록 (추정, 커서 기반 페이지네이션)
- `getPhotos` — 사진 목록 (추정)

```python
# GraphQL 요청 구조 (추정 — DevTools로 실제 query 확인 필요)
import httpx

payload = {
    "operationName": "getPlaceMain",  # DevTools에서 실제값 확인
    "variables": {
        "id": "1234567890",  # placeId (숫자)
    },
    "query": """
        query getPlaceMain($id: String) {
          place(id: $id) {
            id
            name
            category
            address
            roadAddress
            phone
            reviewCount
            visitorReviewScore
            photoCount
            # ... 실제 필드명은 DevTools 응답에서 확인
          }
        }
    """
}

response = httpx.post(
    "https://api.place.naver.com/graphql",
    json=payload,
    headers=headers
)
```

### 수집 가능한 응답 필드 (Apify actor 출력 기준 — 검증됨)

```
place_id                  # 플레이스 고유 ID
name                      # 상호명
category / categoryCode   # 업종
address / roadAddress     # 주소
phone                     # 전화번호
x, y                      # 경위도
visitorReviewsTotal       # 방문자 리뷰 수
visitorReviewsScore       # 평균 별점 (예: 4.52)
reviewStats.avgScore      # 종합 평점
reviewStats.totalCount    # 전체 리뷰 수
reviewStats.imageReviewCount  # 이미지 리뷰 수
businessHours             # 영업시간
menus                     # 메뉴 (이름/가격)
images                    # 사진 목록
```

### 차단 위험도 분석

- **위험 수준**: 중~고
- Naver는 데이터센터 IP를 즉시 차단
- User-Agent 검증 + Referer 헤더 검증 적용
- 주거용(Residential) 프록시 없이는 대량 수집 불안정
- 소량(하루 수십~수백건) 수집은 헤더만 정확히 세팅해도 가능

---

## 2. 네이버 플레이스 URL 파싱 & placeId 추출

### URL 형태별 placeId 추출

```python
import re
import httpx

def extract_place_id(url: str) -> str | None:
    """
    지원 형식:
    - https://map.naver.com/p/search/{keyword}/place/{placeId}
    - https://map.naver.com/p/entry/place/{placeId}
    - https://place.naver.com/restaurant/{placeId}
    - https://m.place.naver.com/place/{placeId}
    - https://naver.me/{shortCode}  → 리다이렉트 추적 필요
    """
    # 1. map.naver.com 검색 결과 URL
    m = re.search(r'/place/(\d+)', url)
    if m:
        return m.group(1)

    # 2. place.naver.com 직접 링크
    m = re.search(r'place\.naver\.com/[^/]+/(\d+)', url)
    if m:
        return m.group(1)

    # 3. naver.me 단축 URL — HTTP 리다이렉트 추적
    if 'naver.me' in url:
        resp = httpx.get(url, follow_redirects=True, timeout=10)
        return extract_place_id(str(resp.url))

    return None
```

### URL 패턴 정리

| URL 형태 | placeId 위치 |
|----------|-------------|
| `map.naver.com/p/search/.../place/{id}` | `/place/` 뒤 숫자 |
| `map.naver.com/p/entry/place/{id}` | `/place/` 뒤 숫자 |
| `m.place.naver.com/place/{id}` | `/place/` 뒤 숫자 |
| `place.naver.com/restaurant/{id}` | 마지막 숫자 세그먼트 |
| `naver.me/{code}` | 리다이렉트 후 위 패턴 적용 |

---

## 3. 키워드 순위 추적

### 방법 비교

| 방법 | 구현 난이도 | 안정성 | 추천 |
|------|------------|--------|------|
| allSearch API + httpx | 중 | 중 | 1순위 (단기) |
| Playwright 자동화 | 고 | 고 | 2순위 (장기) |
| Selenium | 고 | 중 | 비추천 |

### allSearch API 기반 순위 추출 (검증됨)

출처: [velog 네이버 지도 크롤링 고군분투 일기](https://velog.io/@slg1119/)

```python
import httpx
import asyncio

SEARCH_ENDPOINT = "https://map.naver.com/p/api/search/allSearch"

async def get_place_rank(keyword: str, target_place_id: str) -> dict:
    """
    특정 키워드에서 내 플레이스의 순위 반환
    
    Returns:
        {"rank": int, "total": int, "is_ad": bool} 또는 {"rank": -1} if not found
    """
    params = {
        "query": keyword,
        "type": "all",
        # searchCoord, boundary 파라미터도 있으나 기본값으로 동작
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": f"https://map.naver.com/p/search/{keyword}",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(SEARCH_ENDPOINT, params=params, headers=headers)
        data = resp.json()
    
    # 응답 구조: data["result"]["place"]["list"] — 장소 목록
    # 각 항목: {"id": "...", "name": "...", "isAd": bool, ...}
    places = data.get("result", {}).get("place", {}).get("list", [])
    
    organic_rank = 0
    for place in places:
        is_ad = place.get("isAd", False) or place.get("ad", False)
        if not is_ad:
            organic_rank += 1
        
        if str(place.get("id", "")) == str(target_place_id):
            return {
                "rank": organic_rank if not is_ad else None,
                "total_results": len(places),
                "is_ad": is_ad,
            }
    
    return {"rank": -1, "total_results": len(places), "is_ad": False}
```

> **주의**: allSearch 응답의 정확한 JSON 구조는 DevTools에서 실제 요청 확인 필요.  
> 필드명 `isAd` vs `ad` vs 별도 광고 섹션 분리 여부 — 실제 네트워크 응답으로 검증 필수.

### Playwright 기반 순위 추적 (더 신뢰성 높음)

구현 참고: [gpters.org 파이썬 네이버플레이스 검색순위추적기](https://www.gpters.org/dev/post/created-naver-place-search-OM9tiP01t8fVH0i)

```python
from playwright.async_api import async_playwright

async def get_rank_playwright(keyword: str, target_place_id: str) -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        
        # 1. 네이버 검색 접속
        await page.goto(f"https://search.naver.com/search.naver?query={keyword}")
        
        # 2. 플레이스 더보기 클릭
        # → 버튼 셀렉터는 Naver UI 변경 시 갱신 필요
        
        # 3. 무한 스크롤로 전체 목록 수집 (광고 제외)
        rank = 0
        while True:
            items = await page.query_selector_all(".place_list .item")
            for item in items:
                is_ad = await item.query_selector(".ad_label")
                if not is_ad:
                    rank += 1
                place_id = await item.get_attribute("data-id")
                if place_id == target_place_id:
                    await browser.close()
                    return rank
            
            # 스크롤 더 내리기
            prev_height = await page.evaluate("document.body.scrollHeight")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1.5)
            new_height = await page.evaluate("document.body.scrollHeight")
            if new_height == prev_height:
                break  # 끝까지 스크롤
        
        await browser.close()
        return -1  # 미발견
```

### 광고(ad) vs 오가닉 구분

- allSearch API 응답: `isAd` 또는 `ad` 필드로 구분 (실제 응답 확인 필요)
- Playwright: `.ad_label` 또는 `[data-type="ad"]` 등 셀렉터 확인 필요
- 네이버 플레이스 검색 결과 상단 3개는 보통 광고(CPC)

---

## 4. 오픈소스 레포 정리

| 레포 | 방법 | 상태 | 핵심 패턴 |
|------|------|------|----------|
| [omnyx2/naver_place_crawling](https://github.com/omnyx2/naver_place_crawling) | Selenium | 비활성 (URI 변경으로 미동작) | BeautifulSoup + Selenium |
| [goaldeer/naver-place-rank-tracker](https://github.com/goaldeer/naver-place-rank-tracker) | Streamlit + search_engine.py | 유지보수 중 | 키워드 기반 순위 추적 |
| [seolhalee/Naver-Place-scraper](https://github.com/seolhalee/Naver-Place-scraper) | URL 쿼리 파싱 | 연구용 | placeId 추출 + Spearman 상관분석 |
| [progresivoJS/naver-keyword-rank-tracker](https://github.com/progresivoJS/naver-keyword-rank-tracker) | Playwright | 활성 | 네이버 검색 결과 순위 |

### Apify Actor 옵션

| Actor | 기능 | 가격 |
|-------|------|------|
| [delicious_zebu/naver-map-search-results-scraper](https://apify.com/delicious_zebu/naver-map-search-results-scraper/api) | 키워드 검색 결과 (이름/주소/전화/평점/리뷰/영업시간) | $1.50/1,000건 |
| [huggable_quote/naver-map-scraper](https://apify.com/huggable_quote/naver-map-scraper) | 장소 상세 + 리뷰 + 사진 | $3.00/1,000 장소 + $1.00/1,000 리뷰 페이지 |
| [oxygenated_quagmire/naver-place-reviews](https://apify.com/oxygenated_quagmire/naver-place-reviews) | 리뷰 전문 수집 | 별도 |
| [oxygenated_quagmire/naver-place-photos](https://apify.com/oxygenated_quagmire/naver-place-photos) | 사진 수집 | 별도 |

---

## 5. 인프라 권고

### 기본정보 수집 (리뷰수/별점/사진수) — Vercel 가능

```
아키텍처:
  Next.js API Route (Vercel) → httpx → api.place.naver.com/graphql
  
제약:
  - Vercel 서버리스 함수: 최대 실행시간 10초 (Pro: 60초)
  - httpx 직접 호출은 Node 환경에서 불가 → fetch() 사용
  - 또는 Python으로 별도 마이크로서비스 분리
  
권장:
  Node.js (Next.js) 환경이면 → undici/fetch로 GraphQL POST
  Python 환경이면 → httpx + asyncio
  
Vercel 함수에서 직접 네이버 API 호출 시 Vercel IP 차단 위험
  → Browserless 또는 프록시 서비스 레이어 추가 고려
```

### 순위 추적 — Railway 크론잡으로 분리 (권장)

```
이유:
  1. Playwright(Chromium) 바이너리 280MB+ → Vercel 50MB 제한 초과
  2. 순위 추적은 실행시간 수분 소요 → Vercel 타임아웃 초과
  3. Railway는 long-running 서버 지원, 메모리 상한 없음

Railway 구성:
  - Python 서비스 (Playwright 포함)
  - 크론잡: 매일 새벽 2-4시 (서버 부하 낮을 때)
  - 결과를 Supabase에 저장
  
@sparticuz/chromium으로 Vercel 배포 가능하나:
  - 함수당 50MB 근접 (불안정)
  - 실행시간 제한이 더 큰 문제
  → Railway가 맞는 선택
```

### 권장 아키텍처

```
[Vercel — Next.js]
  └─ /api/place/[id]     : 기본정보 조회 (httpx → GraphQL, 캐시 5분)
  └─ /api/place/rank     : 순위 조회 결과 읽기 (Supabase SELECT)

[Railway — Python 크론잡]
  └─ 매일 새벽 03:00     : 등록 플레이스 × 키워드 순위 추적
  └─ Playwright headless : 네이버 검색 자동화
  └─ 결과 → Supabase    : place_rankings 테이블 저장

[Supabase]
  └─ places              : 기본정보 캐시 (1시간 TTL)
  └─ place_rankings      : 키워드별 일별 순위 이력
  └─ monitoring_alerts   : 변경 감지 알림 큐
```

---

## 6. 구현 로드맵 & 리스크

### 1단계: GraphQL 직접 호출 검증 (즉시 가능)

1. Chrome DevTools 열기
2. `https://map.naver.com` 접속
3. 특정 장소 페이지 이동
4. Network → XHR 필터 → `graphql` 요청 선택
5. Request Body의 `operationName`, `variables`, `query` 복사
6. Python httpx로 동일 요청 재현 테스트

### 2단계: allSearch API 검증

1. 키워드 검색 시 `allSearch` 요청 캡처
2. 응답 JSON 구조에서 장소 목록 필드명 확인
3. `isAd` 또는 광고 구분 필드 확인

### 리스크 & 대응

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| GraphQL schema 변경 | 높음 (분기별) | 자동 에러 알림 + 빠른 schema 재파악 |
| IP 차단 | 중간 (소량 수집 시 낮음) | Residential 프록시 도입, 요청 간격 랜덤화 |
| Playwright 셀렉터 변경 | 높음 | 셀렉터 분리 관리 + 에러 시 슬랙 알림 |
| Vercel 타임아웃 | 낮음 (기본정보만) | Railway 분리로 해결 |

---

## 결론 — 크롤마스터 최종 판단

**기본정보 수집 (리뷰수/별점/사진수)**:
→ `api.place.naver.com/graphql` 직접 호출 (httpx, Python)  
→ DevTools로 실제 operationName과 query 먼저 파악하는 게 선행 과제  
→ Vercel API Route에서 Python 마이크로서비스 호출 또는 fetch() 직접 호출

**키워드 순위 추적**:
→ `allSearch` API 먼저 시도 (서버리스 가능, 빠름)  
→ 차단되거나 불안정하면 Playwright로 전환  
→ Railway 크론잡 분리는 현재 아키텍처에서 맞는 선택

**Apify 옵션**:
→ `huggable_quote/naver-map-scraper`: 검증된 안정적 선택지  
→ 장소 1,000개 수집 기준 $3 + 리뷰 $1/1,000페이지  
→ 자체 구현이 불안정하거나 유지보수 부담이 클 때 fallback으로 사용

**핵심 액션 아이템**:
1. DevTools로 `api.place.naver.com/graphql` 요청 실제 캡처 (30분 작업)
2. httpx로 동일 요청 재현 테스트 코드 작성
3. allSearch 응답 JSON 구조 확인
4. Railway 크론잡 환경 설정

---

*Sources:*
- [velog — 네이버 지도 크롤링 고군분투 일기](https://velog.io/@slg1119/)
- [gpters.org — 파이썬 네이버플레이스 검색순위추적기](https://www.gpters.org/dev/post/created-naver-place-search-OM9tiP01t8fVH0i)
- [Apify — naver-map-scraper](https://apify.com/huggable_quote/naver-map-scraper)
- [Apify — naver-map-search-results-scraper](https://apify.com/delicious_zebu/naver-map-search-results-scraper/api)
- [hashscraper — 네이버 크롤링 난이도 분석](https://blog.hashscraper.com/reasons-why-naver-crawling-is-blocked-and-solutions?locale=ko)
- [Railway vs Vercel 비교](https://docs.railway.com/platform/compare-to-vercel)
- [GitHub — goaldeer/naver-place-rank-tracker](https://github.com/goaldeer/naver-place-rank-tracker)
- [GitHub — naver-map-api topics](https://github.com/topics/naver-map-api)
