// 팀구매 마감 실패 시 참여자 환불 (lazy sweep).
// deadline이 지났는데 목표 인원을 못 채운 active 딜을 failed로 전환하고,
// 참여자(joined) 각각에게 낸 금액만큼 포인트를 환불한다.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPoints } from '@/lib/points';

type LooseDb = { from: (table: string) => any };
const db = supabaseAdmin as unknown as LooseDb;

interface FailedMember {
  id: string;
  user_id: string;
  price_paid: number;
  deal_id: string;
}

export async function refundFailedTeamDeals(): Promise<number> {
  const failedDealIds = await markExpiredDealsAsFailed();
  if (failedDealIds.length === 0) return 0;

  const members = await claimJoinedMembersForRefund(failedDealIds);
  for (const member of members) {
    await refundMember(member);
  }
  return members.length;
}

// PostgREST 필터는 column-vs-column 비교(current_count < target_count)를 직접 지원하지 않아
// 만료된 active 딜을 먼저 읽어와 JS에서 미달 여부를 가른 뒤 id 목록으로 조건부 UPDATE한다.
// where status='active' 조건부이므로 동시 호출돼도 한쪽만 행을 얻어 이중 처리가 불가능하다.
async function markExpiredDealsAsFailed(): Promise<string[]> {
  const { data: expired } = await db
    .from('team_deals')
    .select('id, current_count, target_count')
    .eq('status', 'active')
    .lt('deadline', new Date().toISOString());

  const underfilledIds = (expired ?? [])
    .filter((deal: { current_count: number; target_count: number }) => deal.current_count < deal.target_count)
    .map((deal: { id: string }) => deal.id);
  if (underfilledIds.length === 0) return [];

  const { data } = await db
    .from('team_deals')
    .update({ status: 'failed' })
    .eq('status', 'active')
    .in('id', underfilledIds)
    .select('id');
  return (data ?? []).map((row: { id: string }) => row.id);
}

// where status='joined' 조건부 UPDATE returning — 환불 1회만 보장(멱등).
async function claimJoinedMembersForRefund(dealIds: string[]): Promise<FailedMember[]> {
  const { data } = await db
    .from('team_deal_members')
    .update({ status: 'refunded' })
    .in('deal_id', dealIds)
    .eq('status', 'joined')
    .select('id, user_id, price_paid, deal_id');
  return data ?? [];
}

async function refundMember(member: FailedMember): Promise<void> {
  const { awarded } = await awardPoints({
    userId: member.user_id,
    requestedAmount: member.price_paid,
    type: 'refund',
    description: '팀구매 마감 실패 환불',
    referenceId: member.deal_id,
    capExempt: true,
  });
  if (awarded <= 0) return;
  const { data: tx } = await db
    .from('point_transactions')
    .select('id')
    .eq('reference_id', member.deal_id)
    .eq('user_id', member.user_id)
    .eq('type', 'refund')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tx?.id) {
    await db.from('team_deal_members').update({ refund_transaction_id: tx.id }).eq('id', member.id);
  }
}
