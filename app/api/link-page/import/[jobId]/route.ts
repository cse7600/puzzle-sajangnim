import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import type { ParsedImport } from '@/lib/link-import-parser'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { jobId } = await params

  const { data: job } = await (supabaseAdmin as any)
    .from('link_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', sessionUser.id)
    .single()

  if (!job) {
    return NextResponse.json({ error: '이관 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ job })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { jobId } = await params
  const body = await req.json().catch(() => ({}))
  const mode = (body.mode as string) || 'overwrite'
  const selectedBlockIndices = body.selectedBlocks as number[] | undefined

  const { data: job } = await (supabaseAdmin as any)
    .from('link_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', sessionUser.id)
    .single()

  if (!job) {
    return NextResponse.json({ error: '이관 작업을 찾을 수 없습니다' }, { status: 404 })
  }
  if (job.status !== 'preview') {
    return NextResponse.json({ error: '미리보기 상태가 아닌 작업입니다' }, { status: 400 })
  }

  const parsed = job.parsed_payload as ParsedImport
  if (!parsed) {
    return NextResponse.json({ error: '파싱 데이터가 없습니다' }, { status: 400 })
  }

  try {
    await applyImport(sessionUser.id, parsed, mode, selectedBlockIndices)

    await (supabaseAdmin as any)
      .from('link_import_jobs')
      .update({ status: 'applied', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '적용 중 오류가 발생했습니다'
    await (supabaseAdmin as any)
      .from('link_import_jobs')
      .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
      .eq('id', jobId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function applyImport(
  userId: string,
  parsed: ParsedImport,
  mode: string,
  selectedBlockIndices?: number[]
) {
  await (supabaseAdmin as any)
    .from('link_pages')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  const { data: page } = await (supabaseAdmin as any)
    .from('link_pages')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!page) throw new Error('링크 페이지를 찾을 수 없습니다')

  const pageUpdate: Record<string, unknown> = {
    display_name: parsed.profile.displayName,
    bio: parsed.profile.bio || '',
    avatar_url: parsed.profile.avatarUrl,
    sns_links: parsed.profile.snsLinks,
    layout_preset: parsed.design.layoutPreset,
    font_preset: parsed.design.fontPreset,
    theme_preset: parsed.design.themePreset,
    background: parsed.design.background,
    block_style: parsed.design.blockStyle,
    notice_text: parsed.design.noticeText,
    updated_at: new Date().toISOString(),
  }

  await (supabaseAdmin as any)
    .from('link_pages')
    .update(pageUpdate)
    .eq('user_id', userId)

  const blocksToImport = selectedBlockIndices
    ? parsed.blocks.filter((_, i) => selectedBlockIndices.includes(i))
    : parsed.blocks

  if (mode === 'overwrite') {
    await (supabaseAdmin as any)
      .from('link_blocks')
      .delete()
      .eq('link_page_id', page.id)
  }

  let startPosition = 0
  if (mode === 'append') {
    const { data: lastBlock } = await (supabaseAdmin as any)
      .from('link_blocks')
      .select('position')
      .eq('link_page_id', page.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    startPosition = (lastBlock?.position ?? -1) + 1
  }

  if (blocksToImport.length > 0) {
    const rows = blocksToImport.map((block, i) => {
      const { needsRedirectResolve, ...cleanPayload } = block.payload as Record<string, unknown> & { needsRedirectResolve?: boolean }
      return {
        link_page_id: page.id,
        type: block.type,
        payload: cleanPayload,
        position: startPosition + i,
        is_active: true,
      }
    })

    await (supabaseAdmin as any)
      .from('link_blocks')
      .insert(rows)
  }
}
