import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { computeScheduledPayDate, PaybackStatus } from '@/lib/hub';
import { getSettlementDay, fetchMonthlySpendMap } from '@/lib/hub-server';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

/**
 * 특정 월(period)에 대해 이관이 완료된(transfer_status='completed') 계정만 정산 생성.
 * 이미 그 기간에 생성된 계정은 건너뛴다(중복 정산 방지).
 *
 * 절대 규칙: 어드민이 ad_account_monthly_spend에 그 달 실 소진액을 입력한 계정만 정산을 만든다.
 * 사장님이 등록 시 제출한 monthly_spend(신고값)로는 정산을 생성하지 않는다 — 신고값은 광고계정
 * 목록 화면의 예상치 표시에만 쓰이고, 실제 정산 금액의 근거가 되어서는 안 된다. 어드민 전용.
 */
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  const body = await req.json() as { period?: string };
  const period = body.period;

  if (!period || !PERIOD_PATTERN.test(period)) {
    return NextResponse.json({ error: 'period는 YYYY-MM 형식이어야 합니다' }, { status: 400 });
  }

  const [settlementDay, { data: accounts, error: accountsError }, { data: existing, error: existingError }] =
    await Promise.all([
      getSettlementDay(),
      supabaseAdmin
        .from('ad_accounts')
        .select('id, user_id, payback_rate')
        .eq('transfer_status', 'completed'),
      supabaseAdmin.from('paybacks').select('ad_account_id').eq('period', period),
    ]);

  if (accountsError || existingError) {
    return NextResponse.json({ error: '정산 대상 조회에 실패했습니다' }, { status: 500 });
  }

  const alreadyGenerated = new Set((existing ?? []).map(p => p.ad_account_id));
  const targets = (accounts ?? []).filter(a => !alreadyGenerated.has(a.id));

  if (targets.length === 0) {
    return NextResponse.json({ created: 0, alreadyGenerated: (accounts ?? []).length, missingSpend: 0 });
  }

  const monthlySpendMap = await fetchMonthlySpendMap(period, targets.map(a => a.id));
  const readyTargets = targets.filter(account => monthlySpendMap.has(account.id));
  const missingSpend = targets.length - readyTargets.length;

  if (readyTargets.length === 0) {
    return NextResponse.json({ created: 0, alreadyGenerated: alreadyGenerated.size, missingSpend });
  }

  const scheduledPayDate = computeScheduledPayDate(period, settlementDay);
  const initialStatus: PaybackStatus = 'draft';
  const rows = readyTargets.map(account => {
    const spend = monthlySpendMap.get(account.id)!;
    return {
      user_id: account.user_id,
      ad_account_id: account.id,
      amount: Math.round((spend * account.payback_rate) / 100),
      period,
      status: initialStatus,
      scheduled_pay_date: scheduledPayDate,
      cost_basis: 'verified' as const,
    };
  });

  const { data, error } = await supabaseAdmin.from('paybacks').insert(rows).select();

  if (error) {
    return NextResponse.json({ error: '정산 생성에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ created: data.length, alreadyGenerated: alreadyGenerated.size, missingSpend });
}
