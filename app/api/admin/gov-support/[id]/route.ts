export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

const db = supabaseAdmin as any

const LISTING_COLUMNS =
  'pblanc_id, title, jrsdinsttnm, trgetnm, reqst_end_de, is_marketing, region_sido, is_puzzle_transactable, puzzle_note, source, max_support_krw, eligibility_max_revenue_krw, eligibility_industry_keywords, eligibility_notes, puzzle_services, application_steps, curation_status, curated_at'

// bizinfo 원본 필드(title/jrsdinsttnm/trgetnm/reqst_end_de)는 매일 배치가 API 응답으로
// 덮어쓰기 때문에 어드민이 고쳐봐야 다음날 리셋된다. 원본 필드 수정은 manual 행에서만 허용.
const MANUAL_ONLY_FIELDS = ['title', 'jrsdinsttnm', 'trgetnm', 'reqst_end_de'] as const

// 큐레이션 필드는 bizinfo 배치가 건드리지 않으므로 소스와 무관하게 항상 편집 가능.
const CURATION_NUMBER_FIELDS = ['max_support_krw', 'eligibility_max_revenue_krw'] as const
const CURATION_ARRAY_FIELDS = ['eligibility_industry_keywords', 'puzzle_services', 'application_steps'] as const
const ALL_CURATION_FIELDS: readonly string[] = [
  ...CURATION_NUMBER_FIELDS,
  ...CURATION_ARRAY_FIELDS,
  'eligibility_notes',
]

function applyCurationFields(
  body: Record<string, unknown>,
  updates: Record<string, unknown>
): { error: string } | null {
  for (const field of CURATION_NUMBER_FIELDS) {
    if (!(field in body)) continue
    const value = body[field]
    if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      return { error: `${field}는 0 이상의 정수(원 단위) 또는 null이어야 합니다` }
    }
    updates[field] = value
  }
  for (const field of CURATION_ARRAY_FIELDS) {
    if (!(field in body)) continue
    const value = body[field]
    if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) {
      return { error: `${field}는 문자열 배열이어야 합니다` }
    }
    updates[field] = value.map(entry => entry.trim()).filter(entry => entry !== '')
  }
  if ('eligibility_notes' in body) {
    const value = body.eligibility_notes
    if (value !== null && typeof value !== 'string') {
      return { error: 'eligibility_notes는 문자열 또는 null이어야 합니다' }
    }
    const trimmed = typeof value === 'string' ? value.trim() : null
    updates.eligibility_notes = trimmed || null
  }
  return null
}

interface ListingRow {
  pblanc_id: string
  source: string
}

async function loadListing(pblancId: string): Promise<{ listing: ListingRow | null; loadError: unknown }> {
  const { data, error } = await db
    .from('gov_support_listings')
    .select('pblanc_id, source')
    .eq('pblanc_id', pblancId)
    .maybeSingle()
  return { listing: data as ListingRow | null, loadError: error }
}

function buildPatchUpdates(body: Record<string, unknown>, isManual: boolean): Record<string, unknown> | { error: string } {
  const updates: Record<string, unknown> = {}

  if ('is_puzzle_transactable' in body) {
    if (typeof body.is_puzzle_transactable !== 'boolean') {
      return { error: 'is_puzzle_transactable은 boolean이어야 합니다' }
    }
    updates.is_puzzle_transactable = body.is_puzzle_transactable
  }

  if ('puzzle_note' in body) {
    if (body.puzzle_note !== null && typeof body.puzzle_note !== 'string') {
      return { error: 'puzzle_note는 문자열 또는 null이어야 합니다' }
    }
    const trimmed = typeof body.puzzle_note === 'string' ? body.puzzle_note.trim() : null
    updates.puzzle_note = trimmed || null
  }

  const curationError = applyCurationFields(body, updates)
  if (curationError) return curationError

  for (const field of MANUAL_ONLY_FIELDS) {
    if (!(field in body)) continue
    if (!isManual) {
      return { error: 'bizinfo 원본 항목의 기본 정보는 수정할 수 없습니다 (매일 배치가 덮어씁니다)' }
    }
    const value = body[field]
    if (field === 'title') {
      if (typeof value !== 'string' || value.trim() === '') {
        return { error: '사업명을 입력해주세요' }
      }
      updates.title = value.trim()
      continue
    }
    if (field === 'reqst_end_de') {
      const dateValue = typeof value === 'string' ? value.trim() : null
      if (dateValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return { error: '마감일은 YYYY-MM-DD 형식으로 입력해주세요' }
      }
      updates.reqst_end_de = dateValue || null
      continue
    }
    if (value !== null && typeof value !== 'string') {
      return { error: `${field}는 문자열 또는 null이어야 합니다` }
    }
    updates[field] = typeof value === 'string' ? value.trim() || null : null
  }

  return updates
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const { listing, loadError } = await loadListing(params.id)
  if (loadError) {
    return NextResponse.json({ error: '지원사업 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: '지원사업을 찾을 수 없습니다' }, { status: 404 })
  }

  // req.json()은 본문이 리터럴 "null"이어도 정상적으로 null을 resolve하므로(throw 안 함)
  // .catch()만으로는 못 막는다 — null이면 buildPatchUpdates의 `in` 연산자가 TypeError를 던진다.
  const parsedBody = await req.json().catch(() => null)
  const body: Record<string, unknown> = parsedBody && typeof parsedBody === 'object' ? parsedBody : {}
  const updates = buildPatchUpdates(body, listing.source === 'manual')
  if ('error' in updates && typeof updates.error === 'string') {
    return NextResponse.json({ error: updates.error }, { status: 400 })
  }
  // 위의 'error' in 가드가 union을 못 좁히므로(Record도 error 키를 가질 수 있음) 여기서 단언
  const patchUpdates = updates as Record<string, unknown>
  if (Object.keys(patchUpdates).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다' }, { status: 400 })
  }

  // 큐레이션 필드를 사람이 직접 저장하면 검수 완료로 승격 — 클라이언트가 명시하지 않아도 서버가 처리
  if (ALL_CURATION_FIELDS.some(field => field in patchUpdates)) {
    patchUpdates.curation_status = 'admin_reviewed'
    patchUpdates.curated_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from('gov_support_listings')
    .update(patchUpdates)
    .eq('pblanc_id', listing.pblanc_id)
    .select(LISTING_COLUMNS)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '지원사업 저장에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const { listing, loadError } = await loadListing(params.id)
  if (loadError) {
    return NextResponse.json({ error: '지원사업 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: '지원사업을 찾을 수 없습니다' }, { status: 404 })
  }
  if (listing.source !== 'manual') {
    // bizinfo 원본은 매일 배치가 관리한다 — 지워도 다음날 되살아나고, 정합성만 깨진다.
    return NextResponse.json({ error: 'bizinfo 원본 항목은 삭제할 수 없습니다' }, { status: 400 })
  }

  const { error } = await db
    .from('gov_support_listings')
    .delete()
    .eq('pblanc_id', listing.pblanc_id)

  if (error) {
    return NextResponse.json({ error: '지원사업 삭제에 실패했습니다' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
