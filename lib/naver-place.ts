// 네이버 플레이스 비공식 데이터 수집 — 전부 이 파일에 격리한다.
//
// 경고: 네이버 내부 GraphQL / allSearch 는 비공개·무문서이며 operation/필드/헤더가
// 수시로 바뀐다. 신뢰도 LOW. fetchPlaceInfo / fetchKeywordRank 의 응답 파싱은
// 옵셔널 체이닝으로 방어적으로 처리하고, 못 찾는 필드는 null 로 두되 raw 에 원본을
// 그대로 보관한다. 스키마가 깨지면 이 파일만 고치면 되도록 설계한다.
//
// 모든 네트워크 함수는 실패 시 throw 한다 — graceful degradation(등록은 성공, 스냅샷은
// 비움)은 호출부의 try/catch 책임이다.

export interface ParsedPlace {
  placeId: string;
  type: 'restaurant' | 'place' | 'hairshop' | 'hospital' | 'unknown';
}

export interface PlaceBasicInfo {
  name: string;
  address: string | null;
  category: string | null;
  reviewCount: number | null;
  visitorReviewCount: number | null;
  blogReviewCount: number | null;
  rating: number | null;
  photoCount: number | null;
  raw: unknown; // 원본 응답 → snapshots.raw_data
}

export interface KeywordRankResult {
  rank: number | null; // null = 순위권 밖(미노출)
  isAd: boolean;
  totalResults: number | null;
  raw: unknown;
}

/** allSearch searchCoord 용 좌표(경도 x, 위도 y). */
export interface SearchCoord {
  x: string;
  y: string;
}

// 좌표 미지정 시 기본값(서울시청). allSearch 는 searchCoord 없으면 400 을 반환한다.
const DEFAULT_SEARCH_COORD: SearchCoord = {
  x: '126.9783882',
  y: '37.5666103',
};

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const FETCH_TIMEOUT_MS = 8000;

const KNOWN_TYPES: ReadonlySet<ParsedPlace['type']> = new Set([
  'restaurant',
  'place',
  'hairshop',
  'hospital',
]);

/**
 * URL 경로에서 플레이스 타입 세그먼트를 추출한다.
 * /restaurant/123, /hairshop/123 등 → 매칭되는 KNOWN_TYPE, 없으면 'unknown'.
 */
function extractPlaceType(input: string): ParsedPlace['type'] {
  const typeMatch = input.match(/\/(restaurant|hairshop|hospital|place)\/\d+/);
  if (typeMatch && KNOWN_TYPES.has(typeMatch[1] as ParsedPlace['type'])) {
    return typeMatch[1] as ParsedPlace['type'];
  }
  return 'unknown';
}

/**
 * 플레이스 URL / 순수 ID 에서 placeId 추출. 동기, 정규식 기반, 네트워크 불필요.
 * 지원 포맷:
 *   https://m.place.naver.com/restaurant/1085956231/home
 *   https://map.naver.com/p/entry/place/1085956231
 *   https://place.naver.com/hairshop/1085956231
 *   '1085956231' (순수 ID)
 * naver.me 단축 URL 은 async 리다이렉트가 필요하므로 resolveShortUrl 로 먼저 해석할 것.
 * @throws URL 에서 ID 를 못 찾으면 Error
 */
export function parsePlaceId(input: string): ParsedPlace {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return { placeId: trimmed, type: 'unknown' };
  }

  // /restaurant/123, /place/123, /entry/place/123 등 — 타입 세그먼트 + 숫자
  const pathMatch =
    trimmed.match(/\/(?:restaurant|hairshop|hospital|place)\/(\d+)/) ??
    trimmed.match(/place\.naver\.com\/[^/]+\/(\d+)/);

  if (pathMatch) {
    return { placeId: pathMatch[1], type: extractPlaceType(trimmed) };
  }

  throw new Error('네이버 플레이스 ID를 URL에서 찾을 수 없습니다');
}

/**
 * naver.me 단축 URL 을 최종 URL 로 1회 해석한다.
 * 결과 URL 을 다시 parsePlaceId 에 넘기는 것은 호출부 책임.
 * @throws 리다이렉트 추적 실패 시 Error
 */
export async function resolveShortUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': MOBILE_USER_AGENT },
      signal: controller.signal,
    });
    if (!response.url) {
      throw new Error('단축 URL 리다이렉트 결과를 확인할 수 없습니다');
    }
    return response.url;
  } catch (cause) {
    throw new Error(`단축 URL 해석 실패: ${url}`, { cause });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 타임아웃이 걸린 fetch. AbortController 로 FETCH_TIMEOUT_MS 후 abort.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 1회 재시도가 붙은 fetch. 첫 시도 실패(네트워크/타임아웃/비정상 응답) 시 1회 더 시도.
 * @throws 두 번 모두 실패하면 마지막 에러를 cause 로 감싸 throw
 */
async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init);
      if (!response.ok) {
        throw new Error(`네이버 응답 오류 status=${response.status}`);
      }
      return await response.json();
    } catch (cause) {
      lastError = cause;
    }
  }
  throw new Error(`네이버 요청 실패: ${url}`, { cause: lastError });
}

/**
 * unknown 응답에서 점(.)으로 구분된 경로를 따라 값을 안전하게 읽는다.
 * 네이버 스키마가 LOW 신뢰도라 모든 접근을 이 헬퍼로 방어한다.
 */
function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

/**
 * unknown 값을 number 로 강제(가능할 때만). 아니면 null.
 */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * unknown 값을 비어있지 않은 string 으로(가능할 때만). 아니면 null.
 */
function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

// 네이버 GraphQL 엔드포인트는 스키마 변경으로 동작 불가
// ("Cannot query field 'place' on type 'Query'"). 대신 플레이스 home 페이지
// HTML 의 window.__APOLLO_STATE__ 를 파싱한다(실테스트 검증).

// [\s\S] 는 dotAll(s 플래그) 대용 — tsconfig target ES2017 에서 s 플래그 미지원.
const APOLLO_STATE_PATTERN =
  /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/;
const APOLLO_STATE_FALLBACK = /window\.__APOLLO_STATE__\s*=\s*([\s\S]+?);\s*\n/;
const PHOTO_ITEM_PREFIX = 'PlaceDetailTopPhotoItem:';

/**
 * 타임아웃 + 1회 재시도가 붙은 HTML(text) fetch.
 * @throws 두 번 모두 실패하면 마지막 에러를 cause 로 감싸 throw
 */
async function fetchHtmlWithRetry(
  url: string,
  init: RequestInit,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init);
      if (!response.ok) {
        throw new Error(`네이버 응답 오류 status=${response.status}`);
      }
      return await response.text();
    } catch (cause) {
      lastError = cause;
    }
  }
  throw new Error(`네이버 HTML 요청 실패: ${url}`, { cause: lastError });
}

/**
 * home HTML 에서 window.__APOLLO_STATE__ 객체를 추출해 파싱한다.
 * 기본 정규식 실패 시 폴백 정규식으로 한 번 더 시도한다.
 * @throws 두 정규식 모두 매칭 실패 시 Error
 */
function extractApolloState(html: string): Record<string, unknown> {
  const matched =
    html.match(APOLLO_STATE_PATTERN) ?? html.match(APOLLO_STATE_FALLBACK);
  if (!matched) {
    throw new Error('window.__APOLLO_STATE__ 를 HTML 에서 찾을 수 없습니다');
  }
  return JSON.parse(matched[1]) as Record<string, unknown>;
}

/**
 * Apollo State 전체 키 중 PlaceDetailTopPhotoItem: 접두사 키 개수를 센다.
 * 키가 하나도 없으면(섹션 미렌더) null 로 둔다.
 */
function countPhotoItems(apolloState: Record<string, unknown>): number | null {
  const count = Object.keys(apolloState).filter((key) =>
    key.startsWith(PHOTO_ITEM_PREFIX),
  ).length;
  return count > 0 ? count : null;
}

/**
 * 네이버 평점은 미공개 업종에서 0 으로 내려온다(실제 평점 최소 단위는 0 아님).
 * 0 은 "평점 없음"으로 보고 null 처리한다.
 */
function normalizeRating(score: unknown): number | null {
  const parsed = asNumber(score);
  return parsed === 0 ? null : parsed;
}

/**
 * Apollo State 의 PlaceDetailBase:{placeId} 노드를 PlaceBasicInfo 로 매핑한다.
 */
function mapPlaceBasicInfo(
  apolloState: Record<string, unknown>,
  placeId: string,
): PlaceBasicInfo {
  const base = apolloState[`PlaceDetailBase:${placeId}`];
  return {
    name: asString(readPath(base, 'name')) ?? `플레이스 ${placeId}`,
    address:
      asString(readPath(base, 'roadAddress')) ??
      asString(readPath(base, 'address')),
    category: asString(readPath(base, 'category')),
    reviewCount: asNumber(readPath(base, 'visitorReviewsTotal')),
    visitorReviewCount: asNumber(readPath(base, 'visitorReviewsTotal')),
    blogReviewCount: asNumber(readPath(base, 'cafeBlogReviewsTotal')),
    rating: normalizeRating(readPath(base, 'visitorReviewsScore')),
    photoCount: countPhotoItems(apolloState),
    raw: base,
  };
}

/**
 * placeId 로 기본정보 조회. home 페이지 HTML 의 window.__APOLLO_STATE__ 파싱.
 * @throws 네트워크/파싱 실패 시 Error — 호출부에서 catch
 */
export async function fetchPlaceInfo(placeId: string): Promise<PlaceBasicInfo> {
  const html = await fetchHtmlWithRetry(
    `https://pcmap.place.naver.com/place/${placeId}/home`,
    {
      method: 'GET',
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: 'https://m.place.naver.com/',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    },
  );
  const apolloState = extractApolloState(html);
  return mapPlaceBasicInfo(apolloState, placeId);
}

/**
 * allSearch 응답에서 장소 목록을 추출한다. result.place.list 위치 가정(LOW 신뢰도).
 */
function readPlaceList(payload: unknown): unknown[] {
  const list = readPath(payload, 'result.place.list');
  return Array.isArray(list) ? list : [];
}

/**
 * 목록 항목이 광고인지 판별한다. isAd / ad 두 필드를 모두 확인한다.
 */
function isAdEntry(entry: unknown): boolean {
  return (
    readPath(entry, 'isAd') === true ||
    readPath(entry, 'ad') === true
  );
}

/**
 * 키워드 검색 결과에서 내 placeId 의 오가닉 순위를 탐색한다.
 *
 * 주의: 서버(Vercel/데이터센터) IP 에서 allSearch 호출 시 ncaptcha 로 차단된다
 * (searchCoord 를 붙여도 봇으로 탐지됨). 실운영 순위 수집은 Railway Playwright
 * 크론잡(.planning/RAILWAY_PLAYWRIGHT_DESIGN.md)이 담당한다. 이 함수는 로컬 개발
 * 환경 또는 residential IP 에서만 동작하는 폴백이다.
 *
 * @param coord allSearch 가 요구하는 검색 좌표. 미지정 시 서울시청 기본값.
 * @returns 미노출이면 rank=null. @throws 수집 실패 시 Error
 */
export async function fetchKeywordRank(
  keyword: string,
  myPlaceId: string,
  coord: SearchCoord = DEFAULT_SEARCH_COORD,
): Promise<KeywordRankResult> {
  const endpoint = new URL('https://map.naver.com/p/api/search/allSearch');
  endpoint.searchParams.set('query', keyword);
  endpoint.searchParams.set('type', 'all');
  endpoint.searchParams.set('searchCoord', `${coord.x};${coord.y}`);

  const payload = await fetchJsonWithRetry(endpoint.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': MOBILE_USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      Referer: `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`,
    },
  });

  const placeList = readPlaceList(payload);
  let organicRank = 0;
  for (const entry of placeList) {
    const entryIsAd = isAdEntry(entry);
    if (!entryIsAd) {
      organicRank += 1;
    }
    if (String(readPath(entry, 'id') ?? '') === myPlaceId) {
      return {
        rank: entryIsAd ? null : organicRank,
        isAd: entryIsAd,
        totalResults: placeList.length,
        raw: payload,
      };
    }
  }

  return { rank: null, isAd: false, totalResults: placeList.length, raw: payload };
}
