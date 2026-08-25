import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEMO_USER_ID } from '@/lib/auth';
import { PLATFORM_INFO, Platform } from '@/lib/hub';
import { checkDuplicateAccount, attachBusinessNumbers } from '@/lib/hub-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope');
  let query = supabaseAdmin.from('ad_accounts').select('*').order('created_at', { ascending: false });
  if (scope !== 'all') {
    query = query.eq('user_id', DEMO_USER_ID);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '광고계정 목록을 불러오지 못했습니다' }, { status: 500 });
  }
  if (scope !== 'all') {
    return NextResponse.json(data ?? []);
  }
  return NextResponse.json(await attachBusinessNumbers(data ?? []));
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    platform: Platform;
    account_id: string;
    account_name: string;
    monthly_spend: number;
  };
  const { platform, account_id, account_name, monthly_spend } = body;

  if (!platform || !account_id || !account_name || !Number.isFinite(monthly_spend)) {
    return NextResponse.json({ error: '필수 입력값이 누락되었습니다' }, { status: 400 });
  }
  if (!(platform in PLATFORM_INFO)) {
    return NextResponse.json({ error: '지원하지 않는 플랫폼입니다' }, { status: 400 });
  }

  const { isDuplicate, duplicateOfId } = await checkDuplicateAccount(platform, account_id, DEMO_USER_ID);

  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .insert({
      user_id: DEMO_USER_ID,
      platform,
      account_id,
      account_name,
      monthly_spend: Number(monthly_spend),
      payback_rate: PLATFORM_INFO[platform].paybackRate,
      status: 'pending',
      transfer_status: 'waiting',
      connection_status: isDuplicate ? 'duplicate' : 'reviewing',
      duplicate_of: duplicateOfId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: '광고계정 등록에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ...data, duplicateWarning: isDuplicate });
}
