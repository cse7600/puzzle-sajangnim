import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const body = await req.json() as { manager?: string; notes?: string }

  try {
    const { data: account, error: fetchErr } = await supabase
      .from('ad_accounts')
      .select('user_id, platform, account_name')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr

    const { error: updateErr } = await supabase
      .from('ad_accounts')
      .update({ status: 'approval_requested' })
      .eq('id', id)

    if (updateErr) throw updateErr

    await supabase.from('notifications').insert({
      user_id: account.user_id,
      type: 'ad_account_approval',
      title: '광고계정 영업권 등록 요청',
      body: `${account.platform} 광고계정 "${account.account_name}"의 영업권이 등록되었습니다. 승인해 주세요.`,
      metadata: { ad_account_id: id, manager: body.manager ?? '', notes: body.notes ?? '' },
      is_read: false,
    }).catch(() => { /* notifications 테이블 미생성 시 무시 */ })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true, local: true })
  }
}
