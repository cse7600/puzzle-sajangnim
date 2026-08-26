# 네이버 지도 검색결과(Apollo State) 파싱 — Playwright로 렌더시킨 searchIframe HTML을 대상으로 한다.
#
# 2026-08-26 실측 확인 (Railway 배포 전 로컬 residential IP 테스트):
# - headless Playwright로 map.naver.com/p/search/{keyword} 진입 시 ncaptcha-iframe이 항상 함께
#   뜨지만(passive), 그와 별개로 searchIframe(pcmap.place.naver.com/{type}/list?...)이 정상적으로
#   실 데이터를 담은 채 로드된다. 즉 이 캡차 iframe 존재 자체는 차단 신호가 아니다 — 진짜 차단이면
#   searchIframe 자체가 못 뜨거나 안의 __APOLLO_STATE__가 비어있을 것이므로, 그걸 실패 판정 기준으로 쓴다.
# - searchIframe HTML 안에 lib/naver-place.ts와 동일한 window.__APOLLO_STATE__ 가 있고,
#   ROOT_QUERY."placeList(...)".businesses.items 가 광고 없이 순수 오가닉 순서 그대로 담겨 있다
#   (rank = index+1, 필터링 불필요). 광고는 완전히 별도 필드 ROOT_QUERY."adBusinesses(...)"
#   (__typename: RestaurantAdsResult)에 있다 — DOM 스크롤/셀렉터 파싱보다 이 경로가 훨씬 안정적이다.
# - c={x},{y},15,0,0,0,dh 쿼리로 검색 중심좌표를 명시하면 searchIframe URL의 x/y에 그대로 반영된다
#   (실측 확인). 안 주면 Playwright 실행 서버의 IP 기반 위치로 추정되므로, Railway 등 국외/타지역
#   IP에서 결과가 흔들리는 걸 막으려면 반드시 명시해야 한다.
#
# 네이버 내부 스키마이므로 무문서·변경 위험 있음 — 방어적으로 파싱하고 실패 시 raise한다.

import json
import re
from urllib.parse import quote

APOLLO_STATE_PATTERN = re.compile(
    r"window\.__APOLLO_STATE__\s*=\s*(\{.+?\});\s*\n", re.S
)
APOLLO_STATE_FALLBACK_PATTERN = re.compile(
    r"window\.__APOLLO_STATE__\s*=\s*(\{.+?\})\s*</script>", re.S
)


def build_search_url(keyword: str, x: str, y: str) -> str:
    return f"https://map.naver.com/p/search/{quote(keyword)}?c={x},{y},15,0,0,0,dh"


def extract_apollo_state(html: str) -> dict:
    matched = APOLLO_STATE_PATTERN.search(html) or APOLLO_STATE_FALLBACK_PATTERN.search(html)
    if not matched:
        raise ValueError("searchIframe HTML에서 window.__APOLLO_STATE__를 찾을 수 없습니다")
    return json.loads(matched.group(1))


def _deref(node, apollo_state: dict):
    if isinstance(node, dict) and "__ref" in node:
        return apollo_state.get(node["__ref"])
    return node


def _find_root_query_value(apollo_state: dict, prefix: str):
    root_query = apollo_state.get("ROOT_QUERY")
    if not isinstance(root_query, dict):
        return None
    for key, value in root_query.items():
        if key.startswith(prefix):
            return value
    return None


class RankResult:
    def __init__(self, rank, is_ad: bool, total_results, matched_item, found_in: str):
        self.rank = rank
        self.is_ad = is_ad
        self.total_results = total_results
        self.matched_item = matched_item
        self.found_in = found_in  # 'organic' | 'ad' | 'not_found'

    def to_row(self, keyword_id: str, snapshot_date: str) -> dict:
        return {
            "keyword_id": keyword_id,
            "snapshot_date": snapshot_date,
            "rank": self.rank,
            "is_ad": self.is_ad,
            "total_results": self.total_results,
            "raw_data": {
                "found_in": self.found_in,
                "matched_item": self.matched_item,
            },
        }


def find_rank(apollo_state: dict, place_id: str) -> RankResult:
    """
    placeList(...).businesses.items 는 광고가 섞이지 않은 순수 오가닉 순서 배열이다(실측 확인).
    여기서 못 찾으면 adBusinesses(...).items(광고 전용 별도 리스트)에서 찾아 is_ad=True로 표시한다.
    총 결과 개수(total_results)는 businesses.total(네이버 DB 전체 매칭수, 수만 단위 — 실제 노출과
    무관하게 큼)이 아니라 items 배열 길이(실제로 렌더/스캔한 개수, display 파라미터 상한)로 저장한다.
    """
    place_list = _find_root_query_value(apollo_state, "placeList(")
    if place_list is None:
        raise ValueError("ROOT_QUERY에서 placeList(...) 를 찾을 수 없습니다 — 스키마 변경 또는 차단 의심")

    businesses = place_list.get("businesses") or {}
    items = businesses.get("items") or []
    for index, ref in enumerate(items):
        entity = _deref(ref, apollo_state)
        if entity and str(entity.get("id", "")) == str(place_id):
            return RankResult(
                rank=index + 1,
                is_ad=False,
                total_results=len(items),
                matched_item=entity,
                found_in="organic",
            )

    ad_list = _find_root_query_value(apollo_state, "adBusinesses(")
    ad_items = (ad_list or {}).get("items") or []
    for ref in ad_items:
        entity = _deref(ref, apollo_state)
        if entity and str(entity.get("id", "")) == str(place_id):
            return RankResult(
                rank=None,
                is_ad=True,
                total_results=len(items),
                matched_item=entity,
                found_in="ad",
            )

    return RankResult(rank=None, is_ad=False, total_results=len(items), matched_item=None, found_in="not_found")
