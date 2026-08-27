import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const runtime = 'nodejs'

const DETAIL_COLUMNS =
  'pblanc_id, title, jrsdinsttnm, trgetnm, reqst_end_de, summary, apply_method, contact, is_puzzle_transactable, puzzle_note, region_sido, max_support_krw, eligibility_max_revenue_krw, eligibility_industry_keywords, eligibility_notes, puzzle_services, application_steps'

interface ListingDetailRow {
  pblanc_id: string
  title: string
  jrsdinsttnm: string | null
  trgetnm: string | null
  reqst_end_de: string | null
  summary: string | null
  apply_method: string | null
  contact: string | null
  is_puzzle_transactable: boolean
  puzzle_note: string | null
  region_sido: string | null
  max_support_krw: number | null
  eligibility_max_revenue_krw: number | null
  eligibility_industry_keywords: string[] | null
  eligibility_notes: string | null
  puzzle_services: string[] | null
  application_steps: string[] | null
}

interface BusinessProfile {
  region_sido: string | null
  industry_category: string | null
  annual_revenue_krw: number | null
}

type EligibilityStatus = 'likely' | 'unclear' | 'unlikely'

interface EligibilityCheck {
  status: EligibilityStatus
  reasons: string[]
}

function formatEokWon(krw: number): string {
  const eok = Math.floor(krw / 100000000)
  const man = Math.round((krw % 100000000) / 10000)
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString('ko-KR')}만원`
  if (eok > 0) return `${eok}억원`
  return `${man.toLocaleString('ko-KR')}만원`
}

function checkRevenue(listing: ListingDetailRow, profile: BusinessProfile) {
  const limit = listing.eligibility_max_revenue_krw
  if (limit === null) return null
  if (profile.annual_revenue_krw === null) {
    return { pass: null, reason: '매출 정보가 없어 확인이 필요해요' }
  }
  if (profile.annual_revenue_krw > limit) {
    return { pass: false, reason: `연매출이 기준(${formatEokWon(limit)} 이하)을 초과해요` }
  }
  return { pass: true, reason: `연매출 ${formatEokWon(limit)} 이하 조건 충족` }
}

function checkIndustry(listing: ListingDetailRow, profile: BusinessProfile) {
  const keywords = listing.eligibility_industry_keywords ?? []
  if (keywords.length === 0) return null
  if (!profile.industry_category) {
    return { pass: null, reason: '업종 정보가 없어 확인이 필요해요' }
  }
  const industry = profile.industry_category
  const matched = keywords.some(
    keyword => industry.includes(keyword) || keyword.includes(industry)
  )
  if (!matched) {
    return { pass: false, reason: `${keywords.join('·')} 업종 대상이라 업종이 달라요` }
  }
  return { pass: true, reason: `${profile.industry_category} 업종 조건 충족` }
}

function checkRegion(listing: ListingDetailRow, profile: BusinessProfile) {
  if (!listing.region_sido) return null
  if (!profile.region_sido) {
    return { pass: null, reason: '지역 정보가 없어 확인이 필요해요' }
  }
  if (profile.region_sido !== listing.region_sido) {
    return { pass: false, reason: `${listing.region_sido} 지역 사업이라 지역이 달라요` }
  }
  return { pass: true, reason: `${listing.region_sido} 지역 조건 충족` }
}

function buildEligibilityCheck(
  listing: ListingDetailRow,
  profile: BusinessProfile | null
): EligibilityCheck {
  if (!profile) {
    return { status: 'unclear', reasons: ['사업 정보를 등록하면 자격 여부를 바로 확인해드려요'] }
  }

  // 매출/업종 조건은 어드민이 사업 하나하나 분석해서 직접 채워넣은 "진짜 자격 기준"이다.
  // 지역(region_sido)은 수집 배치가 해시태그만 보고 자동으로 채우는 값이라, 지역이 맞았다는
  // 사실만으로 "가능성 높음"을 주면 안 된다 — 큐레이션이 안 된 1,550건 대부분이 이 케이스라
  // "지역만 맞으면 다 된다"는 거짓 확신을 줄 수 있다(실제로 그랬던 버그).
  const curatedChecks = [checkRevenue(listing, profile), checkIndustry(listing, profile)].filter(
    (check): check is { pass: boolean | null; reason: string } => check !== null
  )
  const regionCheck = checkRegion(listing, profile)
  const allChecks = regionCheck ? [...curatedChecks, regionCheck] : curatedChecks

  if (allChecks.length === 0) {
    return { status: 'unclear', reasons: ['이 사업은 자격 조건 자동 확인 정보가 아직 없어요'] }
  }

  const reasons = allChecks.map(check => check.reason)

  // 지역이든 큐레이션 조건이든 명백히 어긋나는 게 있으면 그건 신뢰도 높은 실격 신호다.
  if (allChecks.some(check => check.pass === false)) return { status: 'unlikely', reasons }

  // 큐레이션된 진짜 자격 기준이 하나도 없으면 지역만 맞아도 "확인 필요"에 머문다.
  if (curatedChecks.length === 0) {
    return {
      status: 'unclear',
      reasons: [...reasons, '이 사업은 자격 조건이 아직 상세 분석되지 않았어요 — 지원대상 항목을 참고해주세요'],
    }
  }
  if (allChecks.some(check => check.pass === null)) return { status: 'unclear', reasons }
  return { status: 'likely', reasons }
}

async function loadBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .select('region_sido, industry_category, annual_revenue_krw')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as BusinessProfile
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await supabaseAdmin
    .from('gov_support_listings')
    .select(DETAIL_COLUMNS)
    .eq('pblanc_id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '공고 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '해당 공고를 찾을 수 없습니다' }, { status: 404 })
  }

  const listing = data as unknown as ListingDetailRow
  const profile = await loadBusinessProfile(sessionUser.id)

  return NextResponse.json({
    id: listing.pblanc_id,
    title: listing.title,
    org: listing.jrsdinsttnm,
    target: listing.trgetnm,
    deadline: listing.reqst_end_de,
    summary: listing.summary,
    applyMethod: listing.apply_method,
    contact: listing.contact,
    isTransactable: Boolean(listing.is_puzzle_transactable),
    note: listing.puzzle_note,
    maxSupportKrw: listing.max_support_krw,
    eligibilityMaxRevenueKrw: listing.eligibility_max_revenue_krw,
    eligibilityIndustryKeywords: listing.eligibility_industry_keywords ?? [],
    eligibilityNotes: listing.eligibility_notes,
    puzzleServices: listing.puzzle_services ?? [],
    applicationSteps: listing.application_steps ?? [],
    hasBusinessProfile: profile !== null,
    eligibilityCheck: buildEligibilityCheck(listing, profile),
  })
}
