export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server'
import { isUuid } from '@/lib/admin-users'
import { readAndValidateImage } from '@/lib/image-upload'

const db = supabaseAdmin as any

const NOT_MEMBER_ERROR = '이 팀구매에 참여한 사장님만 이미지를 업로드할 수 있습니다'

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return unauthorizedResponse()
  if (!isUuid(sessionUser.id)) {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }

  const formData = await req.formData()
  const dealId = formData.get('deal_id')
  if (typeof dealId !== 'string' || !isUuid(dealId)) {
    return NextResponse.json({ error: '팀구매를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: member } = await db
    .from('team_deal_members')
    .select('id, status')
    .eq('deal_id', dealId)
    .eq('user_id', sessionUser.id)
    .maybeSingle()
  if (!member || member.status !== 'joined') {
    return NextResponse.json({ error: NOT_MEMBER_ERROR }, { status: 403 })
  }

  const imageCheck = await readAndValidateImage(formData.get('image'), {
    missing: '이미지 파일을 첨부해주세요',
    badType: 'JPG/PNG/WEBP 이미지만 업로드할 수 있습니다',
  })
  if ('error' in imageCheck) {
    return NextResponse.json({ error: imageCheck.error }, { status: 400 })
  }

  const { buffer, extension, contentType } = imageCheck
  const storagePath = `responses/${dealId}/${member.id}/${Date.now()}-${randomUUID()}.${extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('team-deal-images')
    .upload(storagePath, buffer, { contentType, upsert: false })
  if (uploadError) {
    return NextResponse.json(
      { error: `이미지 업로드에 실패했습니다: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data } = supabaseAdmin.storage.from('team-deal-images').getPublicUrl(storagePath)
  return NextResponse.json({ image_url: data.publicUrl })
}
