// 한끼 체험단 — 네이버 블로그 RSS 상시 모니터링
//
// 네이버 블로그 크롤링은 이 프로젝트에서 이미 여러 번 GraphQL 스키마 변경/캡차 차단으로 깨진 전적이
// 있다(lib/naver-place.ts 참고). RSS(`rss.blog.naver.com/{blogId}.xml`)는 캡차가 걸리지 않고
// 서버리스 환경에서도 안정적으로 동작하는 공식 피드라 이 경로만 사용한다. 완전 자동 확정은 하지 않고
// "신규 글 감지"까지만 자동화하며, 실제 광고주 후기 여부의 최종 확정은 어드민 검증 큐로 넘긴다.

const RSS_FETCH_TIMEOUT_MS = 8000

export interface BlogRssItem {
  title: string
  link: string
  pubDate: string | null
  description: string
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXmlEntities(match[1]).trim() : ''
}

function parseRssItems(xml: string): BlogRssItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return itemBlocks.map((block) => ({
    title: extractTag(block, 'title'),
    link: extractTag(block, 'link'),
    pubDate: extractTag(block, 'pubDate') || null,
    description: extractTag(block, 'description'),
  }))
}

// blogId는 "blog.naver.com/{blogId}" 형태의 순수 아이디만 저장/전달한다 (전체 URL이 들어오면 정제).
export function normalizeNaverBlogId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/blog\.naver\.com\/([a-zA-Z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]
  return trimmed.replace(/^@/, '')
}

export async function fetchNaverBlogRssItems(blogId: string): Promise<BlogRssItem[]> {
  const normalized = normalizeNaverBlogId(blogId)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`https://rss.blog.naver.com/${normalized}.xml`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; puzzle-sajangnim-monitor/1.0)' },
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRssItems(xml)
  } catch {
    // RSS 자체가 없거나(비공개 블로그) 네트워크 오류 — 다음 폴링에서 재시도, 여기선 빈 배열로 처리
    return []
  } finally {
    clearTimeout(timer)
  }
}

function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}

export interface BlogMatchResult {
  matched: boolean
  url?: string
  snippet?: string
  publishedAt?: string | null
}

// storeName이 글 제목/본문 어디에든 공백 무시 부분일치하면 "감지"로 판단한다.
// 오탐(다른 가게 언급)까지 걸러내는 확정 판단은 어드민 검증 큐가 최종 담당한다.
export function findStoreMention(items: BlogRssItem[], storeName: string, sinceIso: string | null): BlogMatchResult {
  const target = normalizeForMatch(storeName)
  if (!target) return { matched: false }

  const since = sinceIso ? new Date(sinceIso).getTime() : null

  for (const item of items) {
    if (since !== null && item.pubDate) {
      const published = new Date(item.pubDate).getTime()
      if (!Number.isNaN(published) && published < since) continue
    }
    const haystack = normalizeForMatch(`${item.title} ${item.description}`)
    if (haystack.includes(target)) {
      const snippetSource = item.description || item.title
      return {
        matched: true,
        url: item.link,
        snippet: snippetSource.slice(0, 200),
        publishedAt: item.pubDate,
      }
    }
  }
  return { matched: false }
}

// 참여자 한 명의 블로그를 폴링해 광고주 언급 글을 찾는다. approved_at 이후 발행분만 유효 매칭으로 본다
// (참여 승인 전 과거 글이 우연히 상호명을 언급했다고 자동 매칭되는 것을 방지).
export async function monitorBlogParticipant(params: {
  channelHandle: string
  storeName: string
  approvedAtIso: string | null
}): Promise<BlogMatchResult> {
  const items = await fetchNaverBlogRssItems(params.channelHandle)
  return findStoreMention(items, params.storeName, params.approvedAtIso)
}
