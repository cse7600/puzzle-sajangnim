import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { computeScheduledPayDate } from '@/lib/hub';
import { getSettlementDay } from '@/lib/hub-server';

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

/**
 * 특정 월(period)에 대해 이관이 완료된(transfer_status='completed') 계정만 정산 생성.
 * 이미 그 기간에 생성된 계정은 건너뛴다(중복 정산 방지). 어드민 전용.
 */
export async function POST(req: NextRequest) {
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
        .select('id, user_id, monthly_spend, payback_rate, verified_spend')
        .eq('transfer_status', 'completed'),
      supabaseAdmin.from('paybacks').select('ad_account_id').eq('period', period),
    ]);

  if (accountsError || existingError) {
    return NextResponse.json({ error: '정산 대상 조회에 실패했습니다' }, { status: 500 });
  }

  const alreadyGenerated = new Set((existing ?? []).map(p => p.ad_account_id));
  const targets = (accounts ?? []).filter(a => !alreadyGenerated.has(a.id));

  if (targets.length === 0) {
    return NextResponse.json({ created: 0, skipped: (accounts ?? []).length });
  }

  const scheduledPayDate = computeScheduledPayDate(period, settlementDay);
  const rows = targets.map(account => {
    const spend = account.verified_spend ?? account.monthly_spend;
    return {
      user_id: account.user_id,
      ad_account_id: account.id,
      amount: Math.round((spend * account.payback_rate) / 100),
      period,
      status: 'pending' as const,
      scheduled_pay_date: scheduledPayDate,
      cost_basis: (account.verified_spend != null ? 'verified' : 'submitted') as 'verified' | 'submitted',
    };
  });

  const { data, error } = await supabaseAdmin.from('paybacks').insert(rows).select();

  if (error) {
    return NextResponse.json({ error: '정산 생성에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ created: data.length, skipped: (accounts ?? []).length - data.length });
}
