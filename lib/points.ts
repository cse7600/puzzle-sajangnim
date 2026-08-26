// 포인트 적립/한도 공통 로직 (서버 전용)
import { supabaseAdmin } from '@/lib/supabase-admin';

// 공유 DB 환경: 신규 테이블이 generated types에 없으므로 런타임 접근만 사용
type LooseDb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
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
  | 'community'
  | 'payback'
  | 'refund';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// referral_earnings.earning_rate 기본값(5.00)과 동일 — 추천인 커미션율.
const REFERRAL_COMMISSION_RATE = 5.0;

// 이 타입으로 실제 벌어들인 포인트만 추천인 커미션 대상이다.
// 'payback'은 별도로 paybacks 라우트의 confirmed 전이 시점에 훅을 걸어 처리한다(현금 지급 건도
// 놓치지 않기 위함 — 여기서까지 잡으면 포인트 전환 시 이중 커미션이 된다). 'reward'/'community'/
// 'redeem'/'refund'/'referral' 자체는 커미션 대상이 아니다(연쇄·역산 방지).
const REFERRAL_ELIGIBLE_TYPES: PointType[] = ['receipt', 'knowledge_question', 'knowledge_answer'];

function referralSourceLabel(type: PointType): 'receipt' | 'payback' | 'knowledge' {
  if (type === 'knowledge_question' || type === 'knowledge_answer') return 'knowledge';
  return type as 'receipt' | 'payback';
}

async function getReferrerId(userId: string): Promise<string | null> {
  const { data } = await db.from('users').select('profile_data').eq('id', userId).maybeSingle();
  const profile = data?.profile_data as { referred_by?: string } | null;
  return profile?.referred_by ?? null;
}

// referee가 실제로 번 포인트/정산 금액의 5%를 추천인에게 포인트로 즉시 지급한다.
// skipReferralCommission:true로 지급해 추천인의 추천인에게 번지는 연쇄를 막는다.
export async function awardReferralCommission(params: {
  refereeId: string;
  sourceType: PointType;
  sourceAmount: number;
  referenceId?: string;
}): Promise<void> {
  if (params.sourceAmount <= 0) return;
  const referrerId = await getReferrerId(params.refereeId);
  if (!referrerId) return;

  const earnedAmount = Math.round(params.sourceAmount * (REFERRAL_COMMISSION_RATE / 100));
  if (earnedAmount <= 0) return;

  const sourceLabel = referralSourceLabel(params.sourceType);
  await db.from('referral_earnings').insert({
    referrer_id: referrerId,
    referee_id: params.refereeId,
    source_type: sourceLabel,
    source_amount: params.sourceAmount,
    earning_rate: REFERRAL_COMMISSION_RATE,
    earned_amount: earnedAmount,
    is_paid: true,
  });

  await awardPoints({
    userId: referrerId,
    requestedAmount: earnedAmount,
    type: 'referral',
    description: `추천 수익 · ${sourceLabel}`,
    referenceId: params.referenceId,
    capExempt: true,
    skipReferralCommission: true,
  });
}

async function maybeAwardReferralCommission(
  refereeId: string,
  type: PointType,
  awarded: number,
  referenceId: string | undefined,
  skip: boolean | undefined
): Promise<void> {
  if (skip || awarded <= 0 || !REFERRAL_ELIGIBLE_TYPES.includes(type)) return;
  await awardReferralCommission({ refereeId, sourceType: type, sourceAmount: awarded, referenceId });
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

// 포인트 잔액(원장 SUM). 별도 캐시 컬럼 없이 get_point_balance RPC로 조회한다.
export async function getPointBalance(userId: string): Promise<number> {
  const { data } = await db.rpc('get_point_balance', { p_user_id: userId });
  return Number(data ?? 0);
}

// 한도 내에서 적립 가능한 실제 포인트 계산 + 기록
// capExempt: true면 일일 한도를 적용하지 않는다 (정산금 포인트 전환·환불처럼 이미 확정된 금액용).
// 반환: 실제 적립된 포인트 (한도 초과 시 0 또는 일부)
export async function awardPoints(params: {
  userId: string;
  requestedAmount: number;
  type: PointType;
  description: string;
  referenceId?: string;
  capExempt?: boolean;
  skipReferralCommission?: boolean;
}): Promise<{ awarded: number; capped: boolean; todayTotal: number }> {
  const { userId, requestedAmount, type, description, referenceId, capExempt, skipReferralCommission } = params;

  if (capExempt) {
    if (requestedAmount > 0) {
      await db.from('point_transactions').insert({
        user_id: userId,
        amount: requestedAmount,
        type,
        description,
        reference_id: referenceId ?? null,
      });
    }
    await maybeAwardReferralCommission(userId, type, requestedAmount, referenceId, skipReferralCommission);
    return { awarded: requestedAmount, capped: false, todayTotal: await getTodayEarned(userId) };
  }

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

  await maybeAwardReferralCommission(userId, type, awarded, referenceId, skipReferralCommission);
  return { awarded, capped, todayTotal: earned + awarded };
}
