import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_USER_ID } from '@/lib/auth'

export const runtime = 'nodejs'

const BUSINESS_NUMBER_PATTERN = /^\d{3}-\d{2}-\d{5}$/
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

// 클라이언트가 보낸 file.type은 위조될 수 있으므로(예: .exe에 image/png로 라벨링) 1차로만 쓰고,
// 실제 업로드 전에 매직 바이트로 파일 내용을 다시 검증한다.
const MAGIC_SIGNATURES: { extension: string; contentType: string; matches: (buf: Buffer) => boolean }[] = [
  { extension: 'jpg', contentType: 'image/jpeg', matches: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extension: 'png', contentType: 'image/png', matches: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: 'gif', contentType: 'image/gif', matches: b => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { extension: 'webp', contentType: 'image/webp', matches: b => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { extension: 'pdf', contentType: 'application/pdf', matches: b => b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
]

function validateDeclaredFile(file: FormDataEntryValue | null): { error: string } | null {
  if (!(file instanceof File) || file.size === 0) {
    return { error: '사업자 등록증 파일을 첨부해주세요' }
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return { error: '사업자 등록증은 이미지(JPG/PNG/WEBP/GIF) 또는 PDF 파일만 업로드할 수 있습니다' }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: '파일 크기는 10MB를 초과할 수 없습니다' }
  }
  return null
}

function sniffFileSignature(buffer: Buffer): { extension: string; contentType: string } | null {
  const matched = MAGIC_SIGNATURES.find(sig => sig.matches(buffer))
  return matched ? { extension: matched.extension, contentType: matched.contentType } : null
}

async function readAndValidateCertificate(
  entry: FormDataEntryValue | null
): Promise<{ error: string } | { buffer: Buffer; extension: string; contentType: string }> {
  const declaredCheck = validateDeclaredFile(entry)
  if (declaredCheck) return declaredCheck

  const buffer = Buffer.from(await (entry as File).arrayBuffer())
  const signature = sniffFileSignature(buffer)
  if (!signature) {
    return { error: '파일 내용이 올바른 이미지 또는 PDF 형식이 아닙니다' }
  }
  return { buffer, extension: signature.extension, contentType: signature.contentType }
}

async function uploadCertificate(buffer: Buffer, extension: string, contentType: string) {
  const storagePath = `${DEMO_USER_ID}/${Date.now()}-${randomUUID()}.${extension}`
  const { error } = await supabaseAdmin.storage
    .from('business-certificates')
    .upload(storagePath, buffer, { contentType, upsert: false })
  return { storagePath, error }
}

async function insertVerificationRow(businessNumber: string, storagePath: string) {
  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .insert({
      user_id: DEMO_USER_ID,
      business_number: businessNumber,
      certificate_path: storagePath,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) {
    await supabaseAdmin.storage.from('business-certificates').remove([storagePath])
    return { error: error?.message ?? '알 수 없는 오류' }
  }
  return { verification: data }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const businessNumber = formData.get('business_number')

  if (typeof businessNumber !== 'string' || !BUSINESS_NUMBER_PATTERN.test(businessNumber)) {
    return NextResponse.json(
      { error: '사업자 번호는 000-00-00000 형식으로 입력해주세요' },
      { status: 400 }
    )
  }

  const certificateCheck = await readAndValidateCertificate(formData.get('certificate'))
  if ('error' in certificateCheck) {
    return NextResponse.json({ error: certificateCheck.error }, { status: 400 })
  }

  const { buffer, extension, contentType } = certificateCheck
  const { storagePath, error: uploadError } = await uploadCertificate(buffer, extension, contentType)
  if (uploadError) {
    return NextResponse.json(
      { error: `사업자 등록증 업로드에 실패했습니다: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const inserted = await insertVerificationRow(businessNumber, storagePath)
  if ('error' in inserted) {
    return NextResponse.json(
      { error: `사업자 정보 등록에 실패했습니다: ${inserted.error}` },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { status: inserted.verification.status, submitted_at: inserted.verification.submitted_at },
    { status: 201 }
  )
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .select('*')
    .eq('user_id', DEMO_USER_ID)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '사업자 인증 상태를 불러오지 못했습니다' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ status: 'not_submitted' })
  }

  return NextResponse.json({
    status: data.status,
    business_number: data.business_number,
    reviewer_note: data.reviewer_note,
    submitted_at: data.submitted_at,
    reviewed_at: data.reviewed_at,
  })
}
