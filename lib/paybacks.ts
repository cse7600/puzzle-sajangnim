// 사용자 1인의 정산(payback) 조회 공용 로직 — /api/paybacks(본인 조회)와 /api/earnings가 공유한다.
// 어드민 전체 조회(scope=all, 광고주명 조인)는 이 파일 소관이 아니라 app/api/paybacks/route.ts에 남는다.
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { PaybackStatus, WithdrawalStatus } from '@/lib/hub';

export interface PaybackLineItem {
  id: string;
  user_id: string;
  amount: number;
  period: string;
  status: PaybackStatus;
  cost_basis: 'submitted' | 'verified' | 'manual';
  scheduled_pay_date: string | null;
  withdrawal_deadline: string | null;
  spend_basis_amount: number;
  ad_accounts: { platform: string; account_name: string; payback_rate: number } | null;
  withdrawal: { id: string; status: WithdrawalStatus } | null;
}

interface RawPaybackRow {
  id: string;
  user_id: string;
  amount: number;
  period: string;
  status: PaybackStatus;
  cost_basis: 'submitted' | 'verified' | 'manual';
  scheduled_pay_date: string | null;
  withdrawal_deadline: string | null;
  ad_account_id: string;
  ad_accounts: { platform: string; account_name: string; monthly_spend: number; payback_rate: number } | null;
}

// (ad_account_id, period)별 확인된 월 광고비를 배치 조회해 spend_basis_amount로 붙인다.
// export: 어드민 전체조회(app/api/paybacks/route.ts의 scope=all)도 재사용한다.
export async function attachSpendBasisAmount(rows: RawPaybackRow[]): Promise<(RawPaybackRow & { spend_basis_amount: number })[]> {
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

// 각 정산 건에 현재 유효한(canceled/rejected 제외) 출금 신청 상태를 붙인다.
// export: 어드민 전체조회도 재사용한다.
export async function attachWithdrawalInfo<T extends { id: string }>(
  rows: T[]
): Promise<(T & { withdrawal: { id: string; status: WithdrawalStatus } | null })[]> {
  if (rows.length === 0) return [];

  const paybackIds = rows.map(row => row.id);
  const { data: withdrawals } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, payback_id, status, requested_at')
    .in('payback_id', paybackIds)
    .in('status', ['requested', 'processing', 'paid', 'rejected'])
    .order('requested_at', { ascending: true });

  // 오래된 것부터 넣어 같은 payback_id는 가장 최근 신청으로 덮어써진다
  // (rejected 후 재신청한 경우 최신 requested 건을 보여줘야 함).
  const byPaybackId = new Map<string, { id: string; status: WithdrawalStatus }>();
  for (const row of withdrawals ?? []) {
    byPaybackId.set(row.payback_id, { id: row.id, status: row.status as WithdrawalStatus });
  }
  return rows.map(row => ({ ...row, withdrawal: byPaybackId.get(row.id) ?? null }));
}

// 본인 정산 내역 조회. statuses를 주면 그 상태들만, 생략하면 전체.
export async function getUserPaybacks(userId: string, statuses?: PaybackStatus[]): Promise<PaybackLineItem[]> {
  let query = supabaseAdmin
    .from('paybacks')
    .select('*, ad_accounts(platform, account_name, monthly_spend, payback_rate, verified_spend)')
    .eq('user_id', userId)
    .order('period', { ascending: false });
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const withSpendBasis = await attachSpendBasisAmount(data as RawPaybackRow[]);
  const withWithdrawal = await attachWithdrawalInfo(withSpendBasis);
  return withWithdrawal as unknown as PaybackLineItem[];
}
