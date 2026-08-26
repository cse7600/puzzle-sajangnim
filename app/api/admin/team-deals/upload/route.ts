export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// 클라이언트가 보낸 file.type은 위조될 수 있으므로 1차로만 쓰고,
// 실제 업로드 전에 매직 바이트로 파일 내용을 다시 검증한다 (business-verification 패턴).
const MAGIC_SIGNATURES: { extension: string; contentType: string; matches: (buf: Buffer) => boolean }[] = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extension: 'png', contentType: 'image/png', matches: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: 'webp', contentType: 'image/webp', matches: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
]

async function readAndValidateImage(
  entry: FormDataEntryValue | null
): Promise<{ error: string } | { buffer: Buffer; extension: string; contentType: string }> {
  if (!(entry instanceof File) || entry.size === 0) {
    return { error: '썸네일 이미지 파일을 첨부해주세요' }
  }
  if (!ALLOWED_CONTENT_TYPES.has(entry.type)) {
    return { error: '썸네일은 JPG/PNG/WEBP 이미지만 업로드할 수 있습니다' }
  }
  if (entry.size > MAX_FILE_SIZE_BYTES) {
    return { error: '파일 크기는 5MB를 초과할 수 없습니다' }
  }
  const buffer = Buffer.from(await entry.arrayBuffer())
  const signature = MAGIC_SIGNATURES.find(sig => sig.matches(buffer))
  if (!signature) {
    return { error: '파일 내용이 올바른 이미지 형식이 아닙니다' }
  }
  return { buffer, extension: signature.extension, contentType: signature.contentType }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!sessionUser.isAdmin) return forbiddenResponse()

  const formData = await req.formData()
  const imageCheck = await readAndValidateImage(formData.get('thumbnail'))
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
