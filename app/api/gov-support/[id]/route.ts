import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const runtime = 'nodejs'

const DETAIL_COLUMNS =
  'pblanc_id, title, jrsdinsttnm, trgetnm, reqst_end_de, summary, apply_method, contact, is_puzzle_transactable, puzzle_note'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: listing, error } = await supabaseAdmin
    .from('gov_support_listings')
    .select(DETAIL_COLUMNS)
    .eq('pblanc_id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '공고 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: '해당 공고를 찾을 수 없습니다' }, { status: 404 })
  }

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
  })
}
