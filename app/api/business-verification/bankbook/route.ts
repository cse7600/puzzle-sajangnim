import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 600

// 클라이언트가 보낸 file.type은 위조될 수 있으므로 실제 업로드 전 매직 바이트로 재검증한다.
// (app/api/business-verification/route.ts, app/api/receipts/route.ts와 동일한 패턴)
const MAGIC_SIGNATURES: { extension: string; contentType: string; matches: (buf: Buffer) => boolean }[] = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extension: 'png', contentType: 'image/png', matches: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: 'gif', contentType: 'image/gif', matches: b => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { extension: 'webp', contentType: 'image/webp', matches: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
]

function sniffFileSignature(buffer: Buffer): { extension: string; contentType: string } | null {
  return MAGIC_SIGNATURES.find(sig => sig.matches(buffer)) ?? null
}

async function readAndValidateImage(
  entry: FormDataEntryValue | null
): Promise<{ error: string } | { buffer: Buffer; extension: string; contentType: string }> {
  if (!(entry instanceof File) || entry.size === 0) {
    return { error: '통장사본 사진을 첨부해주세요' }
  }
  if (entry.size > MAX_FILE_SIZE_BYTES) {
    return { error: '파일 크기는 10MB를 초과할 수 없습니다' }
  }
  const buffer = Buffer.from(await entry.arrayBuffer())
  const signature = sniffFileSignature(buffer)
  if (!signature) {
    return { error: '통장사본은 JPG/PNG/GIF/WEBP 이미지만 업로드할 수 있습니다' }
  }
  return { buffer, extension: signature.extension, contentType: signature.contentType }
}

// 정산 계좌 정보(은행/계좌번호/예금주)는 PATCH /api/business-verification가 담당하고,
// 이 라우트는 통장사본 파일만 다룬다 — 사업자 정보를 먼저 제출한 사용자만 업로드할 수 있다.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data: latest, error: latestError } = await supabaseAdmin
    .from('business_verifications')
    .select('id, bankbook_copy_path')
    .eq('user_id', sessionUser.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return NextResponse.json({ error: '사업자 인증 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!latest) {
    return NextResponse.json({ error: '사업자 정보를 먼저 등록해주세요' }, { status: 404 })
  }

  const formData = await req.formData()
  const imageCheck = await readAndValidateImage(formData.get('bankbook_copy'))
  if ('error' in imageCheck) {
    return NextResponse.json({ error: imageCheck.error }, { status: 400 })
  }

  const storagePath = `${sessionUser.id}/${Date.now()}-${randomUUID()}.${imageCheck.extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('bank-accounts')
    .upload(storagePath, imageCheck.buffer, { contentType: imageCheck.contentType, upsert: false })
  if (uploadError) {
    return NextResponse.json({ error: `통장사본 업로드에 실패했습니다: ${uploadError.message}` }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('business_verifications')
    .update({ bankbook_copy_path: storagePath })
    .eq('id', latest.id)

  if (updateError) {
    await supabaseAdmin.storage.from('bank-accounts').remove([storagePath])
    return NextResponse.json({ error: '통장사본 저장에 실패했습니다' }, { status: 500 })
  }

  // 이전 통장사본이 있었다면 교체 후 고아 파일로 남지 않도록 정리한다.
  if (latest.bankbook_copy_path) {
    await supabaseAdmin.storage.from('bank-accounts').remove([latest.bankbook_copy_path])
  }

  const { data: signed } = await supabaseAdmin.storage
    .from('bank-accounts')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  return NextResponse.json({ bankbook_copy_url: signed?.signedUrl ?? null })
}
