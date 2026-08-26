const BIZINFO_API_KEY = process.env.BIZINFO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BIZINFO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('필수 환경변수 누락: BIZINFO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const MARKETING_KEYWORDS = ['마케팅', '홍보', '판로', '온라인', 'SNS', '라이브커머스'];

const SIDO_MAP = {
  서울: '서울특별시',
  부산: '부산광역시',
  대구: '대구광역시',
  인천: '인천광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
  경기: '경기도',
  강원: '강원특별자치도',
  충북: '충청북도',
  충남: '충청남도',
  전북: '전북특별자치도',
  전남: '전라남도',
  경북: '경상북도',
  경남: '경상남도',
  제주: '제주특별자치도',
};
const SIDO_FULL_NAMES = Object.values(SIDO_MAP);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return null;
  const cleaned = rawHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned || null;
}

function parseDateRange(rangeText) {
  if (!rangeText || typeof rangeText !== 'string') return [null, null];
  const matched = rangeText.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!matched) return [null, null];
  return [matched[1], matched[2]];
}

function parseHashtags(hashtagText) {
  if (!hashtagText || typeof hashtagText !== 'string') return [];
  return hashtagText
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function detectMarketing(title, hashtags) {
  const haystack = `${title || ''} ${hashtags.join(' ')}`;
  return MARKETING_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

// 전국 단위 공고는 17개 시도 해시태그가 전부 붙는다 — "첫 매칭"으로 고르면 배열 순서상
// 서울특별시가 항상 이겨서 전국 공고가 전부 서울로 분류되는 버그가 생긴다(실측 확인, 1553건 100%).
// 그래서 hashtags에서 정확히 1개 시도만 매칭될 때만 값을 채우고, 0개(지역태그 없음)나
// 2개 이상(전국/다지역)이면 null로 둔다 — 틀리게 단정하는 것보다 미분류가 낫다.
function detectRegionSido(title, hashtags) {
  const matched = new Set();
  for (const tag of hashtags) {
    if (SIDO_FULL_NAMES.includes(tag)) matched.add(tag);
    else if (SIDO_MAP[tag]) matched.add(SIDO_MAP[tag]);
  }
  if (matched.size === 1) return [...matched][0];
  if (matched.size === 0 && title) {
    // hashtags에 지역 태그가 아예 없는 경우, "[대구] 2026년..." 같은 제목 접두사 관례를 보조로 확인
    const bracketMatch = title.match(/^\[([^\]]+)\]/);
    const label = bracketMatch?.[1];
    if (label) {
      if (SIDO_FULL_NAMES.includes(label)) return label;
      if (SIDO_MAP[label]) return SIDO_MAP[label];
    }
  }
  return null;
}

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.bizinfo.go.kr${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function toRow(record) {
  const title = cleanText(record.pblancNm);
  const hashtags = parseHashtags(record.hashtags);
  const [beginDate, endDate] = parseDateRange(record.reqstBeginEndDe);
  return {
    pblanc_id: record.pblancId,
    title,
    url: toAbsoluteUrl(record.pblancUrl),
    jrsdinsttnm: cleanText(record.jrsdInsttNm),
    excinsttnm: cleanText(record.excInsttNm),
    trgetnm: cleanText(record.trgetNm),
    reqst_begin_de: beginDate,
    reqst_end_de: endDate,
    lclas_nm: cleanText(record.pldirSportRealmLclasCodeNm),
    mlsfc_nm: cleanText(record.pldirSportRealmMlsfcCodeNm),
    hashtags,
    summary: cleanText(record.bsnsSumryCn),
    apply_method: cleanText(record.reqstMthPapersCn),
    contact: cleanText(record.refrncNm),
    is_marketing: detectMarketing(title, hashtags),
    region_sido: detectRegionSido(title, hashtags),
    source: 'bizinfo',
    raw: record,
    updated_at: new Date().toISOString(),
  };
}

async function fetchListings() {
  const apiUrl = new URL('https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do');
  apiUrl.searchParams.set('crtfcKey', BIZINFO_API_KEY);
  apiUrl.searchParams.set('dataType', 'json');
  apiUrl.searchParams.set('searchCnt', '0');

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`기업마당 API 응답 오류: HTTP ${response.status}`);
  }
  const bodyText = await response.text();
  // 본문에 이스케이프 안 된 제어문자가 섞여 JSON.parse가 실패하므로 선제 치환
  const sanitized = bodyText.replace(/[\u0000-\u001F\u007F]/g, " ");
  const parsed = JSON.parse(sanitized);
  const items = parsed?.jsonArray ?? parsed?.item ?? parsed?.items ?? (Array.isArray(parsed) ? parsed : null);
  if (!Array.isArray(items)) {
    throw new Error(`기업마당 API 응답 구조 파싱 실패. 최상위 키: ${Object.keys(parsed).join(', ')}`);
  }
  return items;
}

async function upsertBatch(rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gov_support_listings`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Supabase upsert 실패: HTTP ${response.status} — ${errorBody.slice(0, 500)}`);
  }
}

async function main() {
  const listings = await fetchListings();
  console.log(`기업마당 API 수신: ${listings.length}건`);

  const rows = listings.filter((record) => record.pblancId).map(toRow);
  const skipped = listings.length - rows.length;
  if (skipped > 0) console.log(`pblancId 없는 레코드 제외: ${skipped}건`);

  const BATCH_SIZE = 500;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await upsertBatch(batch);
    console.log(`upsert 진행: ${Math.min(offset + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  const marketingCount = rows.filter((row) => row.is_marketing).length;
  const regionCount = rows.filter((row) => row.region_sido).length;
  console.log(`완료 — 전체 ${rows.length}건 upsert, 마케팅 관련 ${marketingCount}건, 지역 매칭 ${regionCount}건`);
}

main().catch((error) => {
  console.error('수집 실패:', error.message);
  process.exit(1);
});
