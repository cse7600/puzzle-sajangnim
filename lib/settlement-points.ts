// 미신청 정산금의 포인트 자동 전환 (lazy sweep).
// confirmed 정산이 withdrawal_deadline을 넘겼고 활성 출금 신청이 없으면 포인트로 전환한다.
// 배치 인프라 없이, 사용자/어드민이 정산·포인트 화면을 조회하는 시점에 동기 처리한다.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPoints } from '@/lib/points';

type LooseDb = { from: (table: string) => any };
const db = supabaseAdmin as unknown as LooseDb;

interface ConvertedPayback {
  id: string;
  user_id: string;
  amount: number;
  period: string;
}

export async function convertExpiredPaybacks(userId?: string): Promise<number> {
  const converted = await claimExpiredPaybacks(userId);
  for (const payback of converted) {
    await awardConversionPoints(payback);
  }
  await healOrphanedConversions(userId);
  return converted.length;
}

async function getActiveWithdrawalPaybackIds(): Promise<string[]> {
  const { data } = await db
    .from('withdrawal_requests')
    .select('payback_id')
    .in('status', ['requested', 'processing', 'paid']);
  return (data ?? []).map((row: { payback_id: string }) => row.payback_id);
}

// where status='confirmed' 조건부 UPDATE — 동시 호출돼도 한쪽만 행을 얻어 이중 전환이 불가능하다.
async function claimExpiredPaybacks(userId?: string): Promise<ConvertedPayback[]> {
  const activeIds = await getActiveWithdrawalPaybackIds();

  let query = db
    .from('paybacks')
    .update({ status: 'converted_to_points', converted_at: new Date().toISOString() })
    .eq('status', 'confirmed')
    .lt('withdrawal_deadline', new Date().toISOString());
  if (userId) query = query.eq('user_id', userId);
  if (activeIds.length > 0) query = query.not('id', 'in', `(${activeIds.join(',')})`);

  const { data } = await query.select('id, user_id, amount, period');
  return data ?? [];
}

async function awardConversionPoints(payback: ConvertedPayback): Promise<void> {
  if (payback.amount <= 0) return;
  await awardPoints({
    userId: payback.user_id,
    requestedAmount: payback.amount,
    type: 'payback',
    description: `${payback.period} 광고 수수료 포인트 전환`,
    referenceId: payback.id,
    capExempt: true,
  });
}

// status는 converted_to_points인데 포인트 원장(type='payback', reference_id=payback.id)이
// 없는 고아 건을 복구한다 (전환 UPDATE는 성공했으나 뒤이은 포인트 insert만 실패한 경우).
async function healOrphanedConversions(userId?: string): Promise<void> {
  let query = db
    .from('paybacks')
    .select('id, user_id, amount, period')
    .eq('status', 'converted_to_points')
    .gt('amount', 0);
  if (userId) query = query.eq('user_id', userId);
  const { data: converted } = await query;
  if (!converted || converted.length === 0) return;

  const ids = (converted as ConvertedPayback[]).map(row => row.id);
  const { data: existing } = await db
    .from('point_transactions')
    .select('reference_id')
    .eq('type', 'payback')
    .in('reference_id', ids);
  const alreadyAwarded = new Set((existing ?? []).map((row: { reference_id: string }) => row.reference_id));

  for (const payback of converted as ConvertedPayback[]) {
    if (alreadyAwarded.has(payback.id)) continue;
    await awardConversionPoints(payback);
  }
}
