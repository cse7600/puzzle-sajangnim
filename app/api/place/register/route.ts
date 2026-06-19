export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'
import {
  parsePlaceId,
  resolveShortUrl,
  fetchPlaceInfo,
  type PlaceBasicInfo,
} from '@/lib/naver-place'

const db = supabaseAdmin as any
const dbRead = supabaseAdminCached as any

function todayDate(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// place_url 에서 placeId 추출. naver.me 단축 URL 은 먼저 리다이렉트 해석.
async function extractPlaceId(placeUrl: string): Promise<string> {
  let target = placeUrl
  if (placeUrl.includes('naver.me')) {
    try {
      target = await resolveShortUrl(placeUrl)
    } catch {
      target = placeUrl // 해석 실패 시 원본으로 parse 시도 (대개 throw 로 이어짐)
    }
  }
  return parsePlaceId(target).placeId
}

// 네이버 기본정보를 snapshot row 로 변환.
function toSnapshotRow(registrationId: string, info: PlaceBasicInfo) {
  return {
    registration_id: registrationId,
    snapshot_date: todayDate(),
    review_count: info.reviewCount,
    visitor_review_count: info.visitorReviewCount,
    blog_review_count: info.blogReviewCount,
    rating: info.rating,
    photo_count: info.photoCount,
    raw_data: info.raw,
  }
}

export async function POST(req: Request) {
  const { place_url } = await req.json()
  if (!place_url || !place_url.trim()) {
    return NextResponse.json({ error: '플레이스 URL을 입력해주세요.' }, { status: 400 })
  }

  let placeId: string
  try {
    placeId = await extractPlaceId(place_url.trim())
  } catch {
    return NextResponse.json(
      { error: '올바른 네이버 플레이스 URL이 아닙니다' },
      { status: 400 }
    )
  }

  // 네이버 기본정보 수집 — 실패해도 등록은 진행 (graceful degradation)
  let placeInfo: PlaceBasicInfo | null = null
  let fetchFailed = false
  try {
    placeInfo = await fetchPlaceInfo(placeId)
  } catch {
    fetchFailed = true
  }

  const { data: registration, error: regError } = await db
    .from('puzl_place_registrations')
    .upsert(
      {
        user_id: DEMO_USER_ID,
        naver_place_id: placeId,
        place_url: place_url.trim(),
        name: placeInfo?.name ?? `플레이스 ${placeId}`,
        address: placeInfo?.address ?? null,
        category: placeInfo?.category ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,naver_place_id' }
    )
    .select('*')
    .single()

  if (regError || !registration) {
    return NextResponse.json(
      { error: '플레이스 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }

  if (!placeInfo) {
    return NextResponse.json(
      { registration, snapshot: null, fetch_failed: true },
      { status: 201 }
    )
  }

  const { data: snapshot, error: snapError } = await db
    .from('puzl_place_snapshots')
    .upsert(toSnapshotRow(registration.id, placeInfo), {
      onConflict: 'registration_id,snapshot_date',
    })
    .select('*')
    .single()

  if (snapError || !snapshot) {
    return NextResponse.json(
      { registration, snapshot: null, fetch_failed: true },
      { status: 201 }
    )
  }

  return NextResponse.json({ registration, snapshot, fetch_failed: fetchFailed }, { status: 201 })
}

export async function GET() {
  const { data: registrations, error } = await dbRead
    .from('puzl_place_registrations')
    .select('*')
    .eq('user_id', DEMO_USER_ID)
    .order('created_at', { ascending: false })

  if (error || !registrations) {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  }

  const withSnapshots = await Promise.all(
    registrations.map(async (registration: { id: string }) => {
      const { data: snapshots } = await dbRead
        .from('puzl_place_snapshots')
        .select('*')
        .eq('registration_id', registration.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
      return { ...registration, latest_snapshot: snapshots?.[0] ?? null }
    })
  )

  return NextResponse.json(withSnapshots, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
