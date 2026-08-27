import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import {
  identifySource,
  parseInpockPage,
  resolveTrackingRedirects,
  rehostImages,
} from '@/lib/link-import-parser'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as ReturnType<typeof supabaseAdmin['from']> extends never ? typeof supabaseAdmin : typeof supabaseAdmin

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const body = await req.json().catch(() => ({}))
  const sourceUrl = (body.url as string || '').trim()
  if (!sourceUrl) {
    return NextResponse.json({ error: '이관할 URL을 입력해주세요' }, { status: 400 })
  }

  const sourceType = identifySource(sourceUrl)
  if (!sourceType) {
    return NextResponse.json(
      { error: '지원하지 않는 서비스입니다. 현재 인포크링크(link.inpock.co.kr)만 지원합니다.' },
      { status: 400 }
    )
  }

  const { data: job, error: insertErr } = await (supabaseAdmin as any)
    .from('link_import_jobs')
    .insert({
      user_id: sessionUser.id,
      source_type: sourceType,
      source_url: sourceUrl,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single()

  if (insertErr || !job) {
    return NextResponse.json({ error: '이관 작업 생성에 실패했습니다' }, { status: 500 })
  }

  processImportJob(job.id, sourceType, sourceUrl, sessionUser.id).catch(() => {})

  return NextResponse.json({ job }, { status: 201 })
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: jobs } = await (supabaseAdmin as any)
    .from('link_import_jobs')
    .select('id, source_type, source_url, status, error_message, created_at, updated_at')
    .eq('user_id', sessionUser.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ jobs: jobs || [] })
}

async function processImportJob(jobId: string, sourceType: string, sourceUrl: string, userId: string) {
  const updateJob = async (patch: Record<string, unknown>) => {
    await (supabaseAdmin as any)
      .from('link_import_jobs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', jobId)
  }

  try {
    await updateJob({ status: 'parsing' })

    let parsed = await parseInpockPage(sourceUrl)
    parsed = await resolveTrackingRedirects(parsed)
    parsed = await rehostImages(parsed, userId)

    await updateJob({
      status: 'preview',
      parsed_payload: parsed,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다'
    await updateJob({ status: 'failed', error_message: message })
  }
}
