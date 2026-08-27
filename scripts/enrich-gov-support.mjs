// 매일 수집된 지원사업 공고 중 미분석(pending) 건에 대해 Claude로 자격조건을 1차 추출한다.
// 텍스트에 명시된 사실만 뽑고, 없으면 null/빈배열 — 숫자를 지어내는 순간 서비스 신뢰가 무너진다.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('필수 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY');
  process.exit(1);
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const EXTRACT_MODEL = 'claude-haiku-4-5';
const MAX_BATCH = 300;
const CALL_DELAY_MS = 200;

const SUPABASE_HEADERS = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

function buildExtractPrompt(listing) {
  return `다음은 정부 지원사업 공고 정보다.

제목: ${listing.title ?? '(없음)'}
지원대상: ${listing.trgetnm ?? '(없음)'}
사업 요약: ${listing.summary ?? '(없음)'}

위 텍스트에 명시적으로 적힌 사실만 아래 JSON 형식으로 추출하라. 설명 없이 JSON만 출력하라.
{
  "eligibility_max_revenue_krw": 숫자 또는 null,
  "eligibility_industry_keywords": ["업종명"],
  "eligibility_notes": "문장" 또는 null
}

규칙 (반드시 지켜라):
- 텍스트에 없는 내용은 절대 추측하지 마라. 확실하지 않으면 null 또는 빈 배열로 남겨라. 숫자를 지어내면 안 된다.
- eligibility_max_revenue_krw: 매출액 상한이 명시된 경우에만 원 단위 정수로 환산 (예: "매출액 120억원 이하" → 12000000000). 명시가 없으면 null.
- eligibility_industry_keywords: 특정 업종/업태로 지원대상이 제한된다고 명시된 경우에만 그 업종명 배열 (예: ["제조업"]). 일반 소상공인/중소기업 전체 대상이면 빈 배열 [].
- eligibility_notes: 위 두 필드로 담을 수 없는 자격조건이 명시돼 있으면 한국어 한 문장으로 요약, 없으면 null.`;
}

function normalizeExtraction(raw) {
  const revenue = raw?.eligibility_max_revenue_krw;
  const keywords = raw?.eligibility_industry_keywords;
  const notes = raw?.eligibility_notes;
  return {
    eligibility_max_revenue_krw:
      typeof revenue === 'number' && Number.isFinite(revenue) && revenue > 0
        ? Math.round(revenue)
        : null,
    eligibility_industry_keywords: Array.isArray(keywords)
      ? keywords.filter((kw) => typeof kw === 'string' && kw.trim() !== '').map((kw) => kw.trim())
      : [],
    eligibility_notes: typeof notes === 'string' && notes.trim() !== '' ? notes.trim() : null,
  };
}

async function extractEligibility(listing) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: EXTRACT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildExtractPrompt(listing) }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API 오류 (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const textBlock = Array.isArray(payload?.content)
    ? payload.content.find((block) => block.type === 'text')
    : null;
  if (!textBlock?.text) throw new Error('Claude 응답에 텍스트 블록이 없습니다');

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다');
  return normalizeExtraction(JSON.parse(jsonMatch[0]));
}

async function fetchPendingListings() {
  const queryUrl =
    `${SUPABASE_URL}/rest/v1/gov_support_listings` +
    `?is_marketing=eq.true&curation_status=eq.pending` +
    `&select=pblanc_id,title,trgetnm,summary&order=pblanc_id&limit=${MAX_BATCH}`;
  const response = await fetch(queryUrl, { headers: SUPABASE_HEADERS });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`pending 목록 조회 실패: HTTP ${response.status} — ${errBody.slice(0, 300)}`);
  }
  return response.json();
}

async function saveExtraction(pblancId, extracted) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/gov_support_listings?pblanc_id=eq.${encodeURIComponent(pblancId)}`,
    {
      method: 'PATCH',
      headers: { ...SUPABASE_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        ...extracted,
        curation_status: 'ai_suggested',
        curated_at: new Date().toISOString(),
      }),
    }
  );
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`저장 실패: HTTP ${response.status} — ${errBody.slice(0, 300)}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const pendingListings = await fetchPendingListings();
  console.log(`미분석(pending) 마케팅 공고: ${pendingListings.length}건 (배치 상한 ${MAX_BATCH}건)`);

  let savedCount = 0;
  let skippedCount = 0;
  let withRevenueCount = 0;
  let withKeywordsCount = 0;
  let withNotesCount = 0;
  let allEmptyCount = 0;

  for (const listing of pendingListings) {
    try {
      const extracted = await extractEligibility(listing);
      await saveExtraction(listing.pblanc_id, extracted);
      savedCount += 1;
      if (extracted.eligibility_max_revenue_krw !== null) withRevenueCount += 1;
      if (extracted.eligibility_industry_keywords.length > 0) withKeywordsCount += 1;
      if (extracted.eligibility_notes !== null) withNotesCount += 1;
      const isEmpty =
        extracted.eligibility_max_revenue_krw === null &&
        extracted.eligibility_industry_keywords.length === 0 &&
        extracted.eligibility_notes === null;
      if (isEmpty) allEmptyCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.error(`skip ${listing.pblanc_id}: ${error.message}`);
    }
    await sleep(CALL_DELAY_MS);
  }

  console.log(
    `완료 — 저장 ${savedCount}건 / 실패 skip ${skippedCount}건 | ` +
      `매출상한 추출 ${withRevenueCount}건, 업종키워드 ${withKeywordsCount}건, 자격노트 ${withNotesCount}건, ` +
      `전부 비어있음(정상) ${allEmptyCount}건`
  );
}

main().catch((error) => {
  console.error('자격조건 추출 실패:', error.message);
  process.exit(1);
});
