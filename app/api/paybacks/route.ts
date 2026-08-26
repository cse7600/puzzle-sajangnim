export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { usersReadOnlyAdmin, resolveBusinessName } from '@/lib/admin-users';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';
import { convertExpiredPaybacks } from '@/lib/settlement-points';
import { getUserPaybacks, attachSpendBasisAmount, attachWithdrawalInfo } from '@/lib/paybacks';

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

// 어드민 전용 — 전 사용자 정산 목록. 본인 조회(scope 없음)는 lib/paybacks.ts의 getUserPaybacks를 쓴다.
async function getAllPaybacks() {
  const { data, error } = await supabaseAdmin
    .from('paybacks')
    .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate, verified_spend)')
    .order('period', { ascending: false });
  if (error || !data) return null;

  const withSpendBasis = await attachSpendBasisAmount(data as Parameters<typeof attachSpendBasisAmount>[0]);
  const withWithdrawal = await attachWithdrawalInfo(withSpendBasis);
  return attachAdvertiserName(withWithdrawal);
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();

  const scope = req.nextUrl.searchParams.get('scope');
  if (scope === 'all' && !sessionUser.isAdmin) return forbiddenResponse();

  await convertExpiredPaybacks(scope === 'all' ? undefined : sessionUser.id);

  if (scope !== 'all') {
    return NextResponse.json(await getUserPaybacks(sessionUser.id));
  }

  const all = await getAllPaybacks();
  if (!all) {
    return NextResponse.json({ error: '페이백 내역을 불러오지 못했습니다' }, { status: 500 });
  }
  return NextResponse.json(all);
}
