import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { validateBusinessInfoPatch, BusinessInfoPatchBody } from '@/lib/business-info'

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

async function uploadCertificate(userId: string, buffer: Buffer, extension: string, contentType: string) {
  const storagePath = `${userId}/${Date.now()}-${randomUUID()}.${extension}`
  const { error } = await supabaseAdmin.storage
    .from('business-certificates')
    .upload(storagePath, buffer, { contentType, upsert: false })
  return { storagePath, error }
}

async function insertVerificationRow(userId: string, businessNumber: string, storagePath: string) {
  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .insert({
      user_id: userId,
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
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

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
  const { storagePath, error: uploadError } = await uploadCertificate(sessionUser.id, buffer, extension, contentType)
  if (uploadError) {
    return NextResponse.json(
      { error: `사업자 등록증 업로드에 실패했습니다: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const inserted = await insertVerificationRow(sessionUser.id, businessNumber, storagePath)
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
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .select('*')
    .eq('user_id', sessionUser.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '사업자 인증 상태를 불러오지 못했습니다' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ status: 'not_submitted' })
  }

  let bankbookCopyUrl: string | null = null
  if (data.bankbook_copy_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('bank-accounts')
      .createSignedUrl(data.bankbook_copy_path, 600)
    bankbookCopyUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({
    status: data.status,
    business_number: data.business_number,
    reviewer_note: data.reviewer_note,
    submitted_at: data.submitted_at,
    reviewed_at: data.reviewed_at,
    tax_invoice_email: data.tax_invoice_email,
    business_address: data.business_address,
    naver_place_url: data.naver_place_url,
    bank_name: data.bank_name,
    account_number: data.account_number,
    account_holder: data.account_holder,
    bankbook_copy_url: bankbookCopyUrl,
  })
}

// 사장님 본인이 부가 정보(세금계산서 이메일/사업장 주소/네이버 플레이스 URL)만 수정한다.
// status/reviewer_note 등 심사 관련 컬럼은 validateBusinessInfoPatch가 화이트리스트로 걸러
// 절대 건드리지 않으므로, 이 PATCH로는 승인(approved) 상태가 되돌아가지 않는다.
export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()

  let body: BusinessInfoPatchBody
  try {
    body = (await req.json()) as BusinessInfoPatchBody
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 })
  }

  const { data: latest, error: latestError } = await supabaseAdmin
    .from('business_verifications')
    .select('id')
    .eq('user_id', sessionUser.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    return NextResponse.json({ error: '사업자 인증 정보를 불러오지 못했습니다' }, { status: 500 })
  }
  if (!latest) {
    return NextResponse.json({ error: '등록된 사업자 인증 정보가 없습니다' }, { status: 404 })
  }

  const { update, error: validationError } = validateBusinessInfoPatch(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('business_verifications')
    .update(update)
    .eq('id', latest.id)
    .select('tax_invoice_email, business_address, naver_place_url, bank_name, account_number, account_holder')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '사업자 부가 정보 수정에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json(data)
}
