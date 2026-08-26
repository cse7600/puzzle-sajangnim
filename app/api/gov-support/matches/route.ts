import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const runtime = 'nodejs'

const MAX_MATCHES = 30

type MatchedListing = {
  id: string
  title: string
  org: string | null
  target: string | null
  deadline: string | null
  url: string | null
  note?: string
}

function todayInSeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

async function fetchLatestRegion(userId: string) {
  return supabaseAdmin
    .from('business_verifications')
    .select('region_sido')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

async function fetchMatchingListings(regionSido: string | null) {
  let query = supabaseAdmin
    .from('gov_support_listings')
    .select(
      'pblanc_id, title, url, jrsdinsttnm, trgetnm, reqst_end_de, is_puzzle_transactable, puzzle_note',
      { count: 'exact' }
    )
    .eq('is_marketing', true)
    .or(`reqst_end_de.is.null,reqst_end_de.gte.${todayInSeoul()}`)

  if (regionSido) {
    // region_sido는 lib/business-info.ts의 17개 시도 화이트리스트를 거쳐서만 저장되지만,
    // PostgREST .or() 필터 문자열에 값을 삽입하는 구조라 방어적으로 따옴표로 감싼다
    // (쉼표/괄호가 섞이면 필터 문법이 깨지거나 의도치 않은 조건이 결합될 수 있다).
    query = query.or(`region_sido.is.null,region_sido.eq."${regionSido}"`)
  }

  return query
    .order('is_puzzle_transactable', { ascending: false })
    .order('reqst_end_de', { ascending: true, nullsFirst: false })
    .limit(MAX_MATCHES)
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: profile, error: profileError } = await fetchLatestRegion(sessionUser.id)
  if (profileError) {
    return NextResponse.json({ error: '사업 프로필을 불러오지 못했습니다' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ profileComplete: false })
  }

  const { data: listings, error, count } = await fetchMatchingListings(profile.region_sido)
  if (error || !listings) {
    return NextResponse.json({ error: '지원사업 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  const transactable: MatchedListing[] = []
  const directApply: MatchedListing[] = []
  for (const listing of listings) {
    const curated: MatchedListing = {
      id: listing.pblanc_id,
      title: listing.title,
      org: listing.jrsdinsttnm,
      target: listing.trgetnm,
      deadline: listing.reqst_end_de,
      url: listing.url,
    }
    if (listing.is_puzzle_transactable) {
      if (listing.puzzle_note) curated.note = listing.puzzle_note
      transactable.push(curated)
    } else {
      directApply.push(curated)
    }
  }

  return NextResponse.json({
    profileComplete: true,
    regionMissing: !profile.region_sido,
    totalCount: count ?? listings.length,
    transactable,
    directApply,
  })
}
