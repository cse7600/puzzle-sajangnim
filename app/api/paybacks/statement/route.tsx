import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEMO_USER_ID, getCurrentUser } from '@/lib/auth';
import { getSettlementDay } from '@/lib/hub-server';
import { SettlementStatementDocument, StatementData } from '@/lib/pdf/settlement-statement';

export const dynamic = 'force-dynamic';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period');
  const userId = req.nextUrl.searchParams.get('user_id') ?? DEMO_USER_ID;
  if (!period || !PERIOD_PATTERN.test(period)) {
    return NextResponse.json({ error: 'period 쿼리 파라미터는 YYYY-MM 형식이어야 합니다' }, { status: 400 });
  }

  const [{ data: paybacks, error }, settlementDay] = await Promise.all([
    supabaseAdmin
      .from('paybacks')
      .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate, verified_spend)')
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

  // 데모 유저는 로컬 상수에서 이름을 채우고, 그 외 유저는 인증 붙기 전까지 일반 명칭으로 표기(Sprint 2에서 users 조회로 교체)
  const isDemoUser = userId === DEMO_USER_ID;
  const demoUser = getCurrentUser();
  const recipientName = isDemoUser ? demoUser.name : '사장님';
  const businessName = isDemoUser ? demoUser.business_name : '등록된 사업장';

  const rows = paybacks.map(p => {
    const account = p.ad_accounts as unknown as {
      platform: string; account_name: string; monthly_spend: number; payback_rate: number; verified_spend: number | null;
    };
    return {
      platform: account.platform,
      accountName: account.account_name,
      spend: account.verified_spend ?? account.monthly_spend,
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
