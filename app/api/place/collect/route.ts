export const dynamic = 'force-dynamic'
// naver.me 리다이렉트는 register 단계에서 이미 끝났다 — 여기선 information 페이지
// fetch(재시도 포함 최대 16s)만 남아있지만, 네이버 응답이 느릴 때를 대비해 여유를 둔다.
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { fetchPlaceInfo } from '@/lib/naver-place'
import { toSnapshotRow } from '@/lib/place-snapshot'

const db = supabaseAdmin as any

// register(등록)는 즉시 응답하고, 실제 네이버 기본정보 수집은 이 엔드포인트가 별도로
// 맡는다 — 등록 하나에 최대 24s 짜리 동기 요청을 태우면 화면이 "새로고침처럼 멈춘"
// 것처럼 보이는 문제가 있었다(사용자 리포트). 클라이언트는 register 응답을 받은 직후
// 이 엔드포인트를 호출해 "분석 중" 상태를 보여주고, 완료되면 해당 행만 갱신한다.
export async function POST(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { registration_id } = await req.json()
  if (!registration_id) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
  }

  const { data: registration } = await db
    .from('puzl_place_registrations')
    .select('id, naver_place_id')
    .eq('id', registration_id)
    .eq('user_id', sessionUser.id)
    .maybeSingle()

  if (!registration) {
    return NextResponse.json({ error: '등록된 플레이스를 찾을 수 없습니다.' }, { status: 404 })
  }

  let placeInfo
  try {
    placeInfo = await fetchPlaceInfo(registration.naver_place_id)
  } catch {
    return NextResponse.json(
      { error: '네이버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 }
    )
  }

  // 이름/주소/카테고리도 최신화 — 등록 당시엔 아직 몰랐을 수 있다.
  await db
    .from('puzl_place_registrations')
    .update({
      name: placeInfo.name,
      address: placeInfo.address,
      category: placeInfo.category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id)

  const { data: snapshot, error: snapError } = await db
    .from('puzl_place_snapshots')
    .upsert(toSnapshotRow(registration.id, placeInfo), { onConflict: 'registration_id,snapshot_date' })
    .select('*')
    .single()

  if (snapError || !snapshot) {
    return NextResponse.json({ error: '수집 결과 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    snapshot,
    name: placeInfo.name,
    address: placeInfo.address,
    category: placeInfo.category,
  })
}
