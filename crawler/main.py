# GitHub Actions 크론 진입점 — 활성 키워드 전체를 순회하며 네이버 플레이스 검색 순위를
# 수집해 puzl_keyword_rankings에 upsert한다. 원 설계: ../.planning/RAILWAY_PLAYWRIGHT_DESIGN.md
# (Railway 전제였으나 계정 없어 GitHub Actions로 변경, 코드는 실행환경 비의존적이라 무변경)
#
# 실행: python main.py  (.github/workflows/naver-rank-crawler.yml 이 매일 03:00 KST 트리거)
# 부분 실패 허용: 키워드 1개 실패가 전체 잡을 중단시키지 않는다.

import asyncio
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from supabase import Client, create_client

from naver_place_list import build_search_url, extract_apollo_state, find_rank

load_dotenv()

KST = timezone(timedelta(hours=9))

# 서울시청 — lib/naver-place.ts DEFAULT_SEARCH_COORD와 동일 기본값(코드베이스 관례 일치).
# 명시하지 않으면 크롤러 실행 서버의 IP 기반 위치로 검색 중심이 흔들린다(실측 확인).
DEFAULT_X = os.environ.get("SEARCH_COORD_X", "126.9783882")
DEFAULT_Y = os.environ.get("SEARCH_COORD_Y", "37.5666103")

DESKTOP_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

SEARCH_FRAME_WAIT_MS = 800
SEARCH_FRAME_MAX_WAIT_ITERATIONS = 15  # 최대 약 12초 대기
NAV_TIMEOUT_MS = 20000
MAX_ATTEMPTS_PER_KEYWORD = 2


def kst_today() -> str:
    return datetime.now(KST).date().isoformat()


def load_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def fetch_active_keywords(supabase: Client) -> list[dict]:
    """
    puzl_place_keywords(is_active) JOIN puzl_place_registrations(is_active) — 둘 다 활성인 것만.
    PostgREST 임베디드 조인: !inner로 강제해야 registrations.is_active 필터가 실제로 행을 걸러낸다.
    """
    response = (
        supabase.table("puzl_place_keywords")
        .select("id,keyword,puzl_place_registrations!inner(naver_place_id,is_active)")
        .eq("is_active", True)
        .eq("puzl_place_registrations.is_active", True)
        .execute()
    )
    return [
        {
            "keyword_id": row["id"],
            "keyword": row["keyword"],
            "place_id": row["puzl_place_registrations"]["naver_place_id"],
        }
        for row in response.data
    ]


async def find_search_frame(page, timeout_iterations: int = SEARCH_FRAME_MAX_WAIT_ITERATIONS):
    for _ in range(timeout_iterations):
        for frame in page.frames:
            if "pcmap.place.naver.com" in (frame.url or ""):
                return frame
        await page.wait_for_timeout(SEARCH_FRAME_WAIT_MS)
    return None


async def crawl_keyword_rank(context, keyword: str, place_id: str):
    """
    @raises Exception: searchIframe을 못 찾거나 __APOLLO_STATE__ 파싱 실패 시(차단/스키마변경 의심).
    호출부에서 키워드 단위로 catch해 부분 실패를 허용한다.
    """
    last_error: Optional[Exception] = None
    for attempt in range(MAX_ATTEMPTS_PER_KEYWORD):
        page = await context.new_page()
        try:
            url = build_search_url(keyword, DEFAULT_X, DEFAULT_Y)
            await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            frame = await find_search_frame(page)
            if frame is None:
                raise RuntimeError(f"searchIframe을 찾을 수 없습니다 (keyword={keyword})")
            # find_search_frame은 frame.url이 pcmap.place.naver.com으로 바뀐 시점(내비게이션 시작
            # 시점일 수 있음)에 반환한다 — 로드 완료를 명시적으로 기다리지 않으면 frame.content()가
            # __APOLLO_STATE__ 없는 미완성 HTML을 받거나 "page is navigating" 예외를 던질 수 있다
            # (Fable 리뷰 지적, 2026-08-26). 실패하면 attempt 재시도가 흡수한다.
            await frame.wait_for_load_state("domcontentloaded", timeout=NAV_TIMEOUT_MS)
            html = await frame.content()
            apollo_state = extract_apollo_state(html)
            return find_rank(apollo_state, place_id)
        except Exception as error:  # noqa: BLE001 — 키워드별 부분 실패 허용, 마지막에 재raise
            last_error = error
        finally:
            await page.close()
    raise last_error  # type: ignore[misc]


async def run() -> int:
    supabase = load_supabase()
    keywords = fetch_active_keywords(supabase)
    print(f"[crawler] 활성 키워드 {len(keywords)}개 수집 시작")

    rate_min = int(os.environ.get("RATE_LIMIT_MIN_MS", "1500"))
    rate_max = int(os.environ.get("RATE_LIMIT_MAX_MS", "3500"))
    headless = os.environ.get("PLAYWRIGHT_HEADLESS", "true").lower() != "false"
    snapshot_date = kst_today()

    success_count = 0
    notfound_count = 0
    error_count = 0

    async with Stealth().use_async(async_playwright()) as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent=DESKTOP_USER_AGENT,
            viewport={"width": 1400, "height": 1000},
            locale="ko-KR",
        )

        for index, row in enumerate(keywords):
            try:
                result = await crawl_keyword_rank(context, row["keyword"], row["place_id"])
                supabase.table("puzl_keyword_rankings").upsert(
                    result.to_row(row["keyword_id"], snapshot_date),
                    on_conflict="keyword_id,snapshot_date",
                ).execute()
                if result.found_in == "not_found":
                    notfound_count += 1
                else:
                    success_count += 1
                print(
                    f"[crawler] ({index + 1}/{len(keywords)}) '{row['keyword']}' "
                    f"-> rank={result.rank} is_ad={result.is_ad} found_in={result.found_in}"
                )
            except Exception as error:  # noqa: BLE001 — 키워드 1개 실패가 전체 잡을 막지 않는다
                error_count += 1
                print(
                    f"[crawler] ({index + 1}/{len(keywords)}) '{row['keyword']}' 실패: {error}",
                    file=sys.stderr,
                )

            if index < len(keywords) - 1:
                delay_ms = random.randint(rate_min, rate_max)
                await asyncio.sleep(delay_ms / 1000)

        await browser.close()

    print(
        f"[crawler] 완료 — 성공(노출){success_count} / 미노출{notfound_count} / 실패{error_count}"
    )
    # 키워드 0개(아직 등록 없음)는 정상 상태 — error_count도 0이라 자연히 0을 반환한다.
    # 실패가 하나라도 있으면 non-zero: 성공분은 이미 upsert됐으니 데이터 손실은 없고,
    # GitHub Actions 상태만으로 "며칠째 일부가 조용히 계속 실패 중"을 알아챌 수 있게 한다
    # (원래 "전건 실패만 non-zero"였는데 키워드 0개일 때 0 < 0 = False로 매일 실패 처리되는
    # 버그였음 — Fable 리뷰 지적, 2026-08-26).
    return 1 if error_count > 0 else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
