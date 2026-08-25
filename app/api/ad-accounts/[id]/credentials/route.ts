import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEMO_USER_ID } from '@/lib/auth';

/**
 * 비용 자동 확인용 네이버 검색광고 API 키 등록.
 * 지금은 저장만 한다 — 실제로 이 키로 비용을 폴링해오는 배치는 별도 후속 작업(OAuth 연동과 함께).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { customerId?: string; apiKey?: string; secretKey?: string };
  const { customerId, apiKey, secretKey } = body;

  if (!customerId || !apiKey || !secretKey) {
    return NextResponse.json({ error: 'Customer ID, API Key, Secret Key를 모두 입력해주세요' }, { status: 400 });
  }

  const { data: account, error: fetchError } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, user_id, platform')
    .eq('id', params.id)
    .eq('user_id', DEMO_USER_ID)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }
  if (account.platform !== 'naver') {
    return NextResponse.json({ error: '네이버 계정에만 API 키를 등록할 수 있습니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .update({
      api_credentials: { customerId, apiKey, secretKey },
      cost_verification_status: 'configured',
    })
    .eq('id', params.id)
    .select('id, cost_verification_status')
    .single();

  if (error) {
    return NextResponse.json({ error: 'API 키 저장에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(data);
}
