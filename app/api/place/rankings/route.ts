export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdminCached } from '@/lib/supabase-admin'

const dbRead = supabaseAdminCached as any

interface RankingPoint {
  snapshot_date: string
  rank: number | null
  is_ad: boolean
}

interface RankingSeries {
  keyword_id: string
  keyword: string
  points: RankingPoint[]
}

// 오늘에서 days 일 전 날짜(YYYY-MM-DD).
function dateNDaysAgo(days: number): string {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return since.toISOString().slice(0, 10)
}

// 단일 키워드의 N일치 순위 시계열을 RankingSeries 로 만든다.
async function buildSeries(
  keywordRow: { id: string; keyword: string },
  since: string
): Promise<RankingSeries> {
  const { data: rankings } = await dbRead
    .from('puzl_keyword_rankings')
    .select('snapshot_date,rank,is_ad')
    .eq('keyword_id', keywordRow.id)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })

  const points: RankingPoint[] = (rankings ?? []).map(
    (point: RankingPoint) => ({
      snapshot_date: point.snapshot_date,
      rank: point.rank,
      is_ad: point.is_ad,
    })
  )

  return { keyword_id: keywordRow.id, keyword: keywordRow.keyword, points }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const registrationId = params.get('registration_id')
  if (!registrationId) {
    return NextResponse.json({ error: 'registration_id가 필요합니다.' }, { status: 400 })
  }

  const days = Number(params.get('days')) || 30
  const since = dateNDaysAgo(days)

  const { data: keywords, error } = await dbRead
    .from('puzl_place_keywords')
    .select('id,keyword')
    .eq('registration_id', registrationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error || !keywords) {
    return NextResponse.json({ registration_id: registrationId, days, series: [] })
  }

  const series = await Promise.all(
    keywords.map((keywordRow: { id: string; keyword: string }) =>
      buildSeries(keywordRow, since)
    )
  )

  return NextResponse.json(
    { registration_id: registrationId, days, series },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
  )
}
