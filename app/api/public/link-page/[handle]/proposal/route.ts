import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveHandlePage } from '@/lib/link-page-public'
import { rateLimit, getClientIp } from '@/lib/link-rate-limit'

const db = supabaseAdmin as any

const CAMPAIGN_TYPES = ['광고', '공동구매', '협찬', '제품제공', '기타']

export async function POST(
  req: NextRequest,
  { params }: { params: { handle: string } },
) {
  try {
    const { handle } = params
    const body = await req.json().catch(() => ({}))

    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true })
    }

    const ip = getClientIp(req)
    if (!rateLimit(`proposal:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요' },
        { status: 429 },
      )
    }

    const resolved = await resolveHandlePage(supabaseAdmin, handle)
    if (!resolved) {
      return NextResponse.json({ error: '페이지를 찾을 수 없습니다' }, { status: 404 })
    }

    const campaignType = body.campaign_type
    if (!CAMPAIGN_TYPES.includes(campaignType)) {
      return NextResponse.json({ error: '캠페인 유형을 선택해 주세요' }, { status: 400 })
    }

    const brandName = typeof body.brand_name === 'string' ? body.brand_name.trim() : ''
    const productName = typeof body.product_name === 'string' ? body.product_name.trim() : ''
    if (!brandName || brandName.length > 100) {
      return NextResponse.json({ error: '브랜드명을 100자 이내로 입력해 주세요' }, { status: 400 })
    }
    if (productName.length > 100) {
      return NextResponse.json({ error: '상품/서비스명을 100자 이내로 입력해 주세요' }, { status: 400 })
    }

    const features = typeof body.features === 'string' ? body.features : ''
    const proposalMessage = typeof body.proposal_message === 'string' ? body.proposal_message : ''
    if (features.length > 2000) {
      return NextResponse.json({ error: '특징은 2000자 이내로 입력해 주세요' }, { status: 400 })
    }
    if (proposalMessage.length > 2000) {
      return NextResponse.json({ error: '제안서는 2000자 이내로 입력해 주세요' }, { status: 400 })
    }

    const proposerName = typeof body.proposer_name === 'string' ? body.proposer_name.trim() : ''
    const proposerEmail = typeof body.proposer_email === 'string' ? body.proposer_email.trim() : ''
    const proposerPhone = typeof body.proposer_phone === 'string' ? body.proposer_phone.trim() : ''
    if (!proposerName || !proposerEmail || !proposerPhone) {
      return NextResponse.json({ error: '제안자 이름/이메일/연락처는 필수입니다' }, { status: 400 })
    }

    const categories = Array.isArray(body.categories)
      ? body.categories.filter((c: unknown) => typeof c === 'string')
      : []

    const { data: inserted, error: insErr } = await db
      .from('business_proposals')
      .insert({
        user_id: resolved.userId,
        campaign_image_url: typeof body.campaign_image_url === 'string' ? body.campaign_image_url : null,
        campaign_type: campaignType,
        brand_name: brandName,
        product_name: productName,
        categories,
        features: features || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        reward_type: typeof body.reward_type === 'string' ? body.reward_type : null,
        reward_amount: typeof body.reward_amount === 'string' ? body.reward_amount : null,
        proposal_message: proposalMessage || null,
        proposer_name: proposerName,
        proposer_email: proposerEmail,
        proposer_phone: proposerPhone,
      })
      .select('id')
      .single()

    if (insErr) {
      console.error('[link-page proposal] insert error:', insErr.message)
      return NextResponse.json({ error: '제안 저장에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted.id })
  } catch (error) {
    console.error('[link-page proposal] error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
