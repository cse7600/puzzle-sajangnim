export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

const LISTING_COLUMNS =
  'pblanc_id, title, jrsdinsttnm, trgetnm, reqst_end_de, is_marketing, region_sido, is_puzzle_transactable, puzzle_note, source, max_support_krw, eligibility_max_revenue_krw, eligibility_industry_keywords, eligibility_notes, puzzle_services, application_steps, curation_status, curated_at'

const CURATION_STATUSES = ['pending', 'ai_suggested', 'admin_reviewed'] as const

const DEFAULT_PAGE_SIZE = 30
const MAX_PAGE_SIZE = 100

function escapeLikePattern(raw: string): string {
  // ilike 값은 독립된 쿼리 파라미터로 전달되므로 PostgREST 필터 문법(쉼표 등)에는 안전하지만,
  // LIKE 와일드카드(% _)와 이스케이프 문자(\)는 사용자 입력 그대로 두면 패턴으로 해석된다.
  return raw.replace(/[\\%_]/g, matched => `\\${matched}`)
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const searchParams = req.nextUrl.searchParams
  const q = (searchParams.get('q') ?? '').trim()
  const page = parsePositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
  const onlyTransactable = searchParams.get('onlyTransactable') === 'true'
  const curationStatusParam = searchParams.get('curationStatus')
  const curationStatus = (CURATION_STATUSES as readonly string[]).includes(curationStatusParam ?? '')
    ? curationStatusParam
    : null

  let query = db
    .from('gov_support_listings')
    .select(LISTING_COLUMNS, { count: 'exact' })

  if (q) {
    query = query.ilike('title', `%${escapeLikePattern(q)}%`)
  }
  if (onlyTransactable) {
    query = query.eq('is_puzzle_transactable', true)
  }
  if (curationStatus) {
    query = query.eq('curation_status', curationStatus)
  }

  const from = (page - 1) * pageSize
  const { data, count, error } = await query
    // source desc → 'manual'이 'bizinfo'보다 사전순으로 뒤라서 수동 큐레이션이 먼저 온다
    .order('source', { ascending: false })
    .order('is_puzzle_transactable', { ascending: false })
    .order('title', { ascending: true })
    .range(from, from + pageSize - 1)

  if (error) {
    return NextResponse.json({ error: '지원사업 목록을 불러오지 못했습니다' }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], totalCount: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: '사업명을 입력해주세요' }, { status: 400 })
  }

  const reqstEndDe = typeof body.reqst_end_de === 'string' && body.reqst_end_de.trim() !== ''
    ? body.reqst_end_de.trim()
    : null
  if (reqstEndDe && !/^\d{4}-\d{2}-\d{2}$/.test(reqstEndDe)) {
    return NextResponse.json({ error: '마감일은 YYYY-MM-DD 형식으로 입력해주세요' }, { status: 400 })
  }

  const insertRow = {
    pblanc_id: `manual-${crypto.randomUUID()}`,
    title,
    jrsdinsttnm: typeof body.jrsdinsttnm === 'string' ? body.jrsdinsttnm.trim() || null : null,
    trgetnm: typeof body.trgetnm === 'string' ? body.trgetnm.trim() || null : null,
    reqst_end_de: reqstEndDe,
    is_puzzle_transactable: typeof body.is_puzzle_transactable === 'boolean' ? body.is_puzzle_transactable : true,
    puzzle_note: typeof body.puzzle_note === 'string' ? body.puzzle_note.trim() || null : null,
    is_marketing: true,
    source: 'manual',
  }

  const { data, error } = await db
    .from('gov_support_listings')
    .insert(insertRow)
    .select(LISTING_COLUMNS)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '지원사업 등록에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
