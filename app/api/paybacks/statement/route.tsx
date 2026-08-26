import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';
import { getSettlementDay, fetchMonthlySpendMap, resolveSpendBasis } from '@/lib/hub-server';
import { SettlementStatementDocument, StatementData } from '@/lib/pdf/settlement-statement';
import type { UserProfileData } from '@/lib/profile';

export const dynamic = 'force-dynamic';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();

  const period = req.nextUrl.searchParams.get('period');
  const requestedUserId = req.nextUrl.searchParams.get('user_id');
  // user_id 쿼리 파라미터는 관리자가 타 사용자 정산서를 조회할 때만 허용한다.
  // 일반 사용자가 이 값을 임의로 지정해 타인의 정산 PDF를 받아가지 못하도록 세션 유저로 강제한다.
  if (requestedUserId && !sessionUser.isAdmin) return forbiddenResponse();
  const userId = requestedUserId ?? sessionUser.id;
  if (!period || !PERIOD_PATTERN.test(period)) {
    return NextResponse.json({ error: 'period 쿼리 파라미터는 YYYY-MM 형식이어야 합니다' }, { status: 400 });
  }

  const [{ data: paybacks, error }, settlementDay] = await Promise.all([
    supabaseAdmin
      .from('paybacks')
      .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate)')
      .eq('user_id', userId)
      .eq('period', period),
    getSettlementDay(),
  ]);

  if (error) {
    return NextResponse.json({ error: '정산 내역 조회에 실패했습니다' }, { status: 500 });
  }
  if (!paybacks || paybacks.length === 0) {
    return NextResponse.json({ error: '해당 기간의 정산 내역이 없습니다' }, { status: 404 });
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('profile_data')
    .eq('id', userId)
    .maybeSingle();
  const profile = (userRow?.profile_data ?? null) as UserProfileData | null;
  const recipientName = profile?.name ?? '사장님';
  const businessName = profile?.business_name ?? '등록된 사업장';

  const monthlySpendMap = await fetchMonthlySpendMap(period, paybacks.map(p => p.ad_account_id));
  const rows = paybacks.map(p => {
    const account = p.ad_accounts as unknown as {
      platform: string; account_name: string; monthly_spend: number; payback_rate: number;
    };
    // 실제 표시용 광고비는 확인값 우선(resolveSpendBasis)이되, 기준(costBasis) 라벨은
    // 관리자가 amount를 수동 조정했을 수 있는 payback 자체의 cost_basis를 신뢰한다.
    const { spend } = resolveSpendBasis(monthlySpendMap, p.ad_account_id, account.monthly_spend);
    return {
      platform: account.platform,
      accountName: account.account_name,
      spend,
      costBasis: p.cost_basis,
      paybackRate: account.payback_rate,
      amount: p.amount,
    };
  });

  const data: StatementData = {
    period,
    recipientName,
    businessName,
    rows,
    totalAmount: rows.reduce((sum, r) => sum + r.amount, 0),
    scheduledPayDate: paybacks[0].scheduled_pay_date,
    status: paybacks.every(p => p.status === 'paid') ? 'paid' : paybacks[0].status,
    settlementDay,
    generatedAt: new Date().toISOString().slice(0, 10),
    documentNo: `PUZL-${period}-${userId.slice(0, 8)}`,
  };

  const buffer = await renderToBuffer(<SettlementStatementDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${data.documentNo}.pdf"`,
    },
  });
}
