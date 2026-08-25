import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEMO_USER_ID } from '@/lib/auth';
import { maskAdAccountCredentials } from '@/lib/hub-server';

/** 사장님이 "확인 요청"을 취소하면 연동 확인 중 → 연동 필요로 되돌린다. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, user_id, transfer_status')
    .eq('id', params.id)
    .eq('user_id', DEMO_USER_ID)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }
  if (account.transfer_status !== 'verifying') {
    return NextResponse.json({ error: '지금 단계에서는 확인 요청을 취소할 수 없습니다' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .update({ transfer_status: 'transfer_needed' })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '확인 요청 취소 처리에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(maskAdAccountCredentials(data));
}
