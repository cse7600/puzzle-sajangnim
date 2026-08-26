import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_BYTES = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

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
  const fileName = `link-pages/${sessionUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabaseAdmin.storage.from('board-images').upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.error('[link-page upload] storage error:', error.message)
    return NextResponse.json({ error: '업로드에 실패했습니다' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('board-images').getPublicUrl(fileName)
  return NextResponse.json({ url: urlData.publicUrl })
}
