export const dynamic = 'force-dynamic'
// naver.me 리다이렉트(최대 8s) + information 페이지 fetch(재시도 포함 최대 16s)가
// 직렬로 걸릴 수 있어(최악 24s) Vercel 기본 서버리스 타임아웃을 넘을 수 있다.
// 여유를 두고 늘려서 504로 죽는 대신 정상적으로 fetch_failed 폴백을 타게 한다.
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
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
    has_reservation: info.hasReservation,
    keyword_count: info.keywordList?.length ?? null,
    has_description: info.description !== null,
    menu_count: info.menuCount,
    photo_urls: info.photoUrls,
    raw_data: info.raw,
  }
}

const VALID_ROLES = new Set(['mine', 'competitor'])

// postgres unique_violation. 'mine' 은 유저당 1개로 부분 유니크 인덱스가 걸려있다
// (migrations/013) — onConflict 대상(user_id,naver_place_id)과 다른 제약이라 upsert가
// 못 잡고 insert 에러로 올라온다.
function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505')
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { place_url, role: rawRole } = await req.json()
  if (!place_url || !place_url.trim()) {
    return NextResponse.json({ error: '플레이스 URL을 입력해주세요.' }, { status: 400 })
  }
  const role = VALID_ROLES.has(rawRole) ? rawRole : 'mine'

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
        user_id: sessionUser.id,
        naver_place_id: placeId,
        place_url: place_url.trim(),
        name: placeInfo?.name ?? `플레이스 ${placeId}`,
        address: placeInfo?.address ?? null,
        category: placeInfo?.category ?? null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,naver_place_id' }
    )
    .select('*')
    .single()

  if (regError || !registration) {
    if (isUniqueViolation(regError)) {
      return NextResponse.json(
        { error: '이미 등록된 내 가게가 있습니다. 새 가게로 바꾸려면 기존 등록을 먼저 삭제해주세요.' },
        { status: 409 }
      )
    }
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
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: registrations, error } = await dbRead
    .from('puzl_place_registrations')
    .select('*')
    .eq('user_id', sessionUser.id)
    .order('created_at', { ascending: false })

  if (error || !registrations) {
    return NextResponse.json(
      { mine: null, competitors: [] },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    )
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

  const mine = withSnapshots.find((registration) => registration.role === 'mine') ?? null
  const competitors = withSnapshots.filter((registration) => registration.role === 'competitor')

  return NextResponse.json(
    { mine, competitors },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
  )
}

export async function DELETE(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const registrationId = new URL(req.url).searchParams.get('registration_id')
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
  }

  const { data: deleted, error } = await db
    .from('puzl_place_registrations')
    .delete()
    .eq('id', registrationId)
    .eq('user_id', sessionUser.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
  if (!deleted) {
    return NextResponse.json({ error: '등록된 플레이스를 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
