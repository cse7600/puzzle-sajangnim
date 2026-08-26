export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin, supabaseAdminCached } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any
const dbRead = supabaseAdminCached as any

// registration 이 요청자 소유인지 확인 (타 유저 스냅샷 데이터 조회 차단)
async function ownsRegistration(registrationId: string, userId: string): Promise<boolean> {
  const { data: registration } = await db
    .from('puzl_place_registrations')
    .select('id')
    .eq('id', registrationId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(registration)
}

// 오늘에서 days 일 전 날짜(YYYY-MM-DD).
function dateNDaysAgo(days: number): string {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return since.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const params = new URL(req.url).searchParams
  const registrationId = params.get('registration_id')
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
  }
  if (!(await ownsRegistration(registrationId, sessionUser.id))) {
    return NextResponse.json({ error: '등록된 플레이스를 찾을 수 없습니다.' }, { status: 404 })
  }

  const days = Number(params.get('days')) || 30
  const since = dateNDaysAgo(days)

  const { data: snapshots, error } = await dbRead
    .from('puzl_place_snapshots')
    .select('*')
    .eq('registration_id', registrationId)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })

  if (error || !snapshots) {
    return NextResponse.json({ registration_id: registrationId, days, snapshots: [] })
  }

  return NextResponse.json(
    { registration_id: registrationId, days, snapshots },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
  )
}
