export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'
import { readAndValidateImage } from '@/lib/image-upload'

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const formData = await req.formData()
  const imageCheck = await readAndValidateImage(formData.get('thumbnail'), {
    missing: '썸네일 이미지 파일을 첨부해주세요',
    badType: '썸네일은 JPG/PNG/WEBP 이미지만 업로드할 수 있습니다',
  })
  if ('error' in imageCheck) {
    return NextResponse.json({ error: imageCheck.error }, { status: 400 })
  }

  const { buffer, extension, contentType } = imageCheck
  const storagePath = `deals/${Date.now()}-${randomUUID()}.${extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('team-deal-images')
    .upload(storagePath, buffer, { contentType, upsert: false })
  if (uploadError) {
    return NextResponse.json(
      { error: `썸네일 업로드에 실패했습니다: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data } = supabaseAdmin.storage.from('team-deal-images').getPublicUrl(storagePath)
  return NextResponse.json({ thumbnail_url: data.publicUrl })
}
