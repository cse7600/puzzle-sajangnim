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

// 추정 GraphQL operation — 구현 시점 네트워크 탭으로 재확인 필요(LOW 신뢰도).
const PLACE_INFO_QUERY = `
  query getPlaceMain($id: String!) {
    place(id: $id) {
      id
      name
      category
      address
      roadAddress
      reviewCount
      visitorReviewCount
      visitorReviewScore
      blogCafeReviewCount
      photoCount
    }
  }
`;

/**
 * 네이버 내부 GraphQL 응답을 PlaceBasicInfo 로 매핑한다.
 * 응답 루트가 data.place 인지 place 인지 불확실하므로 둘 다 시도한다.
 */
function mapPlaceBasicInfo(payload: unknown, placeId: string): PlaceBasicInfo {
  const place = readPath(payload, 'data.place') ?? readPath(payload, 'place');
  return {
    name: asString(readPath(place, 'name')) ?? `플레이스 ${placeId}`,
    address:
      asString(readPath(place, 'roadAddress')) ??
      asString(readPath(place, 'address')),
    category: asString(readPath(place, 'category')),
    reviewCount: asNumber(readPath(place, 'reviewCount')),
    visitorReviewCount: asNumber(readPath(place, 'visitorReviewCount')),
    blogReviewCount: asNumber(readPath(place, 'blogCafeReviewCount')),
    rating: asNumber(readPath(place, 'visitorReviewScore')),
    photoCount: asNumber(readPath(place, 'photoCount')),
    raw: payload,
  };
}

/**
 * placeId 로 기본정보 조회 (네이버 내부 GraphQL).
 * @throws 네트워크/파싱 실패 시 Error — 호출부에서 catch
 */
export async function fetchPlaceInfo(placeId: string): Promise<PlaceBasicInfo> {
  const payload = await fetchJsonWithRetry(
    'https://pcmap-api.place.naver.com/graphql',
    {
      method: 'POST',
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: 'https://m.place.naver.com/',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://map.naver.com',
      },
      body: JSON.stringify({
        operationName: 'getPlaceMain',
        variables: { id: placeId },
        query: PLACE_INFO_QUERY,
      }),
    },
  );
  return mapPlaceBasicInfo(payload, placeId);
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
 * @returns 미노출이면 rank=null. @throws 수집 실패 시 Error
 */
export async function fetchKeywordRank(
  keyword: string,
  myPlaceId: string,
): Promise<KeywordRankResult> {
  const endpoint = new URL('https://map.naver.com/p/api/search/allSearch');
  endpoint.searchParams.set('query', keyword);
  endpoint.searchParams.set('type', 'all');

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
