export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

const db = supabaseAdmin as any
const dbRead = supabaseAdminCached as any

// registration 이 데모 유저 소유인지 확인 (타 유저 키워드 조작 차단)
async function ownsRegistration(registrationId: string): Promise<boolean> {
  const { data: registration } = await db
    .from('puzl_place_registrations')
    .select('id')
    .eq('id', registrationId)
    .eq('user_id', DEMO_USER_ID)
    .maybeSingle()
  return Boolean(registration)
}

export async function POST(req: Request) {
  const { registration_id, keyword } = await req.json()
  if (!registration_id) {
    return NextResponse.json({ error: '등록된 플레이스를 선택해주세요.' }, { status: 400 })
  }
  if (!keyword || !keyword.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })
  }
  if (!(await ownsRegistration(registration_id))) {
    return NextResponse.json({ error: '등록된 플레이스를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: keywordRow, error } = await db
    .from('puzl_place_keywords')
    .insert({ registration_id, keyword: keyword.trim() })
    .select('id,registration_id,keyword,is_active,created_at')
    .single()

  if (error?.code === '23505') {
    return NextResponse.json({ error: '이미 등록된 키워드입니다' }, { status: 409 })
  }
  if (error || !keywordRow) {
    return NextResponse.json({ error: '키워드 추가 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ keyword: keywordRow }, { status: 201 })
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: '삭제할 키워드 id가 필요합니다.' }, { status: 400 })
  }

  const { error } = await db.from('puzl_place_keywords').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: '키워드 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// 키워드 + 각 키워드 최신 순위 1건을 병합해 KeywordWithRank[] 로 반환.
async function attachLatestRank(keywordRow: { id: string; keyword: string; is_active: boolean }) {
  const { data: rankings } = await dbRead
    .from('puzl_keyword_rankings')
    .select('rank,is_ad,snapshot_date')
    .eq('keyword_id', keywordRow.id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
  const latest = rankings?.[0] ?? null
  return {
    id: keywordRow.id,
    keyword: keywordRow.keyword,
    is_active: keywordRow.is_active,
    latest_rank: latest?.rank ?? null,
    latest_is_ad: latest?.is_ad ?? false,
    rank_snapshot_date: latest?.snapshot_date ?? null,
  }
}

export async function GET(req: Request) {
  const registrationId = new URL(req.url).searchParams.get('registration_id')
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
  }

  const { data: keywords, error } = await dbRead
    .from('puzl_place_keywords')
    .select('id,keyword,is_active')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: true })

  if (error || !keywords) return NextResponse.json([])

  const withRanks = await Promise.all(keywords.map(attachLatestRank))
  return NextResponse.json(withRanks)
}
