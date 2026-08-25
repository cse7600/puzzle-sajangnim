export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEMO_USER_ID } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope');
  let query = supabaseAdmin
    .from('paybacks')
    .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate, verified_spend)')
    .order('period', { ascending: false });
  if (scope !== 'all') {
    query = query.eq('user_id', DEMO_USER_ID);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '페이백 내역을 불러오지 못했습니다' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
