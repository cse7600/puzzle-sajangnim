import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-server';
import { maskAdAccountCredentials } from '@/lib/hub-server';

/** 사장님이 "이관 완료, 확인 요청"을 누르면 대기/연동 필요 → 연동 확인 중으로 전환. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();

  const { data: account, error: fetchError } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, user_id, transfer_status')
    .eq('id', params.id)
    .eq('user_id', sessionUser.id)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }
  if (account.transfer_status !== 'waiting' && account.transfer_status !== 'transfer_needed') {
    return NextResponse.json({ error: '지금 단계에서는 확인 요청을 보낼 수 없습니다' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .update({ transfer_status: 'verifying' })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '확인 요청 처리에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(maskAdAccountCredentials(data));
}
