export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdminCached } from '@/lib/supabase-admin'

const dbRead = supabaseAdminCached as any

// 오늘에서 days 일 전 날짜(YYYY-MM-DD).
function dateNDaysAgo(days: number): string {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return since.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const registrationId = params.get('registration_id')
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
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
