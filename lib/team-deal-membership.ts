// 딜 목록/상세에 세션 유저의 참여 정보를 붙인다.
// team_deal_members는 RLS on·정책 0건이라 anon 클라이언트로는 조회가 비어 나온다 — service role 필수.
import { supabaseAdmin } from '@/lib/supabase-admin'

const db = supabaseAdmin as any

export interface MyMembership {
  quantity: number
  price_paid: number
  status: string
}

export async function attachMyMembership<T extends { id: string }>(
  deals: T[],
  userId: string
): Promise<(T & { my_membership: MyMembership | null })[]> {
  if (deals.length === 0) return []
  const { data: memberships } = await db
    .from('team_deal_members')
    .select('deal_id, quantity, price_paid, status')
    .eq('user_id', userId)
    .in('deal_id', deals.map(deal => deal.id))
  const byDealId = new Map<string, MyMembership>(
    (memberships ?? []).map((m: { deal_id: string } & MyMembership) => [
      m.deal_id,
      { quantity: m.quantity, price_paid: m.price_paid, status: m.status },
    ])
  )
  return deals.map(deal => ({ ...deal, my_membership: byDealId.get(deal.id) ?? null }))
}
