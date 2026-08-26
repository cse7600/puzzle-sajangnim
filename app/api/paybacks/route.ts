export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';

interface PaybackWithAdAccount {
  ad_account_id: string;
  period: string;
  ad_accounts: { monthly_spend: number } | null;
}

// (ad_account_id, period)별 확인된 월 광고비를 한 번에 조회해 spend_basis_amount로 붙인다.
// 라우트별로 각자 N+1 조회하지 않도록 이 파일 안에서만 쓰는 배치 조회.
async function attachSpendBasisAmount<T extends PaybackWithAdAccount>(
  rows: T[]
): Promise<(T & { spend_basis_amount: number })[]> {
  if (rows.length === 0) return [];

  const periods = Array.from(new Set(rows.map(r => r.period)));
  const adAccountIds = Array.from(new Set(rows.map(r => r.ad_account_id)));

  const { data: monthlySpend } = await supabaseAdmin
    .from('ad_account_monthly_spend')
    .select('ad_account_id, period, spend_vat_excluded')
    .in('period', periods)
    .in('ad_account_id', adAccountIds);

  const verifiedMap = new Map((monthlySpend ?? []).map(row => [`${row.ad_account_id}:${row.period}`, row.spend_vat_excluded]));

  return rows.map(row => {
    const verified = verifiedMap.get(`${row.ad_account_id}:${row.period}`);
    const spendBasisAmount = verified ?? row.ad_accounts?.monthly_spend ?? 0;
    return { ...row, spend_basis_amount: spendBasisAmount };
  });
}

// 정산서는 광고계정이 아니라 광고주(사장님) 단위로 발행되므로, 어드민 목록에는 광고주명을 붙여준다.
// users는 공유 테이블이라 usersReadOnlyAdmin(id/email/profile_data만 노출)로만 조회한다.
async function attachAdvertiserName<T extends { user_id: string }>(
  rows: T[]
): Promise<(T & { advertiser_name: string })[]> {
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map(r => r.user_id)));
  const { data: users } = await usersReadOnlyAdmin
    .from('users')
    .select('id, email, profile_data')
    .in('id', userIds);

  const nameByUserId = new Map((users ?? []).map(u => [u.id, resolveBusinessName(u)]));

  return rows.map(row => ({ ...row, advertiser_name: nameByUserId.get(row.user_id) ?? row.user_id }));
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();

  const scope = req.nextUrl.searchParams.get('scope');
  if (scope === 'all' && !sessionUser.isAdmin) return forbiddenResponse();

  let query = supabaseAdmin
    .from('paybacks')
    .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate, verified_spend)')
    .order('period', { ascending: false });
  if (scope !== 'all') {
    query = query.eq('user_id', sessionUser.id);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '페이백 내역을 불러오지 못했습니다' }, { status: 500 });
  }
  const withSpendBasis = await attachSpendBasisAmount(data ?? []);
  if (scope !== 'all') {
    return NextResponse.json(withSpendBasis);
  }
  return NextResponse.json(await attachAdvertiserName(withSpendBasis));
}
