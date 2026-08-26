import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveHandlePage } from '@/lib/link-page-public'
import { rateLimit, getClientIp } from '@/lib/link-rate-limit'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_BYTES = 20 * 1024 * 1024

export async function POST(
  req: NextRequest,
  { params }: { params: { handle: string } },
) {
  try {
    const { handle } = params

    const ip = getClientIp(req)
    if (!rateLimit(`proposal-image:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요' },
        { status: 429 },
      )
    }

    const resolved = await resolveHandlePage(supabaseAdmin, handle)
    if (!resolved) {
      return NextResponse.json({ error: '페이지를 찾을 수 없습니다' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'JPG, PNG, WEBP 형식만 업로드할 수 있습니다' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '이미지는 20MB 이하만 업로드할 수 있습니다' }, { status: 400 })
    }

    const SAFE_EXTS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const ext = SAFE_EXTS[file.type] || 'jpg'
    const fileName = `link-proposals/${handle}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await supabaseAdmin.storage.from('board-images').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })
    if (error) {
      console.error('[proposal-image upload] storage error:', error.message)
      return NextResponse.json({ error: '업로드에 실패했습니다' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('board-images').getPublicUrl(fileName)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[proposal-image upload] error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
