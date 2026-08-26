export const dynamic = 'force-dynamic'
// naver.me 리다이렉트 해석(최대 8s)만 여기서 한다. information 페이지 수집(최대 16s)은
// /api/place/collect 로 분리했다 — 등록 하나에 최대 24s 동기 요청을 태우면 화면이
// "새로고침처럼 멈춘" 것처럼 보이는 문제가 있었다(사용자 리포트, 2026-08-26).
export const maxDuration = 15

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { parsePlaceId, resolveShortUrl } from '@/lib/naver-place'

const db = supabaseAdmin as any
// 등록/삭제 직후 화면을 즉시 새로고침해도 최신 상태가 보여야 한다 — 캐시된 클라이언트를
// 쓰면 등록 후 30초 안에 새로고침 시 방금 등록한 게 안 보여서 "등록이 안 된다"로
// 보였을 것(사용자 리포트, 2026-08-26). 개인 대시보드 목록이라 DB 왕복 비용보다 정확성이 우선.
const dbRead = supabaseAdmin as any

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

const VALID_ROLES = new Set(['mine', 'competitor'])
const MAX_COMPETITORS = 10

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

  // 기본정보 수집은 /api/place/collect 가 별도로 담당한다. 여기선 등록 행만 즉시
  // 만들어서 빠르게 응답한다 — 단, 이미 등록된 가게를 재등록(가게 정보 수정 등)하는
  // 경우엔 기존 name/address/category 를 유지해서 collect 완료 전까지 화면에 잠깐
  // "플레이스 12345" 같은 placeholder 가 뜨는 걸 막는다.
  const { data: existing } = await db
    .from('puzl_place_registrations')
    .select('name, address, category, role')
    .eq('user_id', sessionUser.id)
    .eq('naver_place_id', placeId)
    .maybeSingle()

  // 이미 다른 용도(내 가게 ↔ 경쟁자)로 등록된 가게를 그대로 upsert하면 role 이 조용히
  // 뒤바뀐다 — 특히 경쟁자 추가 모달에 실수로 내 가게 URL을 넣으면 "내 가게"가 사라진다.
  if (existing?.role && existing.role !== role) {
    return NextResponse.json(
      {
        error:
          existing.role === 'mine'
            ? '이미 내 가게로 등록된 곳입니다.'
            : '이미 경쟁자로 등록된 곳입니다. 내 가게로 등록하려면 먼저 경쟁자 목록에서 삭제해주세요.',
      },
      { status: 409 }
    )
  }

  if (role === 'competitor' && !existing) {
    const { count } = await db
      .from('puzl_place_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sessionUser.id)
      .eq('role', 'competitor')
    if ((count ?? 0) >= MAX_COMPETITORS) {
      return NextResponse.json(
        { error: `경쟁자는 최대 ${MAX_COMPETITORS}개까지 등록할 수 있습니다.` },
        { status: 409 }
      )
    }
  }

  const { data: registration, error: regError } = await db
    .from('puzl_place_registrations')
    .upsert(
      {
        user_id: sessionUser.id,
        naver_place_id: placeId,
        place_url: place_url.trim(),
        name: existing?.name ?? `플레이스 ${placeId}`,
        address: existing?.address ?? null,
        category: existing?.category ?? null,
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

  return NextResponse.json({ registration }, { status: 201 })
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
      { headers: { 'Cache-Control': 'private, no-store' } }
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
