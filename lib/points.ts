// 포인트 적립/한도 공통 로직 (서버 전용)
import { supabaseAdmin } from '@/lib/supabase-admin';

// 공유 DB 환경: 신규 테이블이 generated types에 없으므로 런타임 접근만 사용
type LooseDb = {
  from: (table: string) => any;
};
const db = supabaseAdmin as unknown as LooseDb;

export const DAILY_POINT_CAP = 60000;

export type PointType =
  | 'receipt'
  | 'knowledge_question'
  | 'knowledge_answer'
  | 'referral'
  | 'reward'
  | 'redeem'
  | 'community';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// 오늘 적립한 총 포인트 조회
export async function getTodayEarned(userId: string): Promise<number> {
  const { data } = await db
    .from('daily_point_limits')
    .select('total_points_earned')
    .eq('user_id', userId)
    .eq('date', today())
    .maybeSingle();
  return data?.total_points_earned ?? 0;
}

// 한도 내에서 적립 가능한 실제 포인트 계산 + 기록
// 반환: 실제 적립된 포인트 (한도 초과 시 0 또는 일부)
export async function awardPoints(params: {
  userId: string;
  requestedAmount: number;
  type: PointType;
  description: string;
  referenceId?: string;
}): Promise<{ awarded: number; capped: boolean; todayTotal: number }> {
  const { userId, requestedAmount, type, description, referenceId } = params;
  const earned = await getTodayEarned(userId);
  const remaining = Math.max(0, DAILY_POINT_CAP - earned);
  const awarded = Math.min(requestedAmount, remaining);
  const capped = awarded < requestedAmount;

  if (awarded > 0) {
    await db.from('point_transactions').insert({
      user_id: userId,
      amount: awarded,
      type,
      description,
      reference_id: referenceId ?? null,
    });
    await db.from('daily_point_limits').upsert(
      { user_id: userId, date: today(), total_points_earned: earned + awarded },
      { onConflict: 'user_id,date' }
    );
  }

  return { awarded, capped, todayTotal: earned + awarded };
}
