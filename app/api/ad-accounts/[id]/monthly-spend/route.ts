import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// updated_at은 DB에 default now()만 있고 트리거는 없어 Insert 타입 생성기가 컬럼을 아예 제외했다.
// upsert 시 갱신값을 명시적으로 넣어야 하므로 Insert 타입에 updated_at만 더해 사용한다.
type MonthlySpendUpsert = Database['public']['Tables']['ad_account_monthly_spend']['Insert'] & {
  updated_at?: string;
};

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

async function parseJsonBody(req: NextRequest): Promise<{ body: unknown; error: string | null }> {
  try {
    return { body: await req.json(), error: null };
  } catch {
    return { body: null, error: '요청 본문이 올바른 JSON 형식이 아닙니다' };
  }
}

function validatePeriod(value: unknown): string | null {
  if (typeof value !== 'string' || !PERIOD_PATTERN.test(value)) return null;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12 ? value : null;
}

function validateSpend(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

async function ensureAdAccountExists(adAccountId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('ad_accounts')
    .select('id')
    .eq('id', adAccountId)
    .maybeSingle();
  return data !== null;
}

type ReconcileOutcome = {
  attempted: boolean;
  updated: boolean;
  paybackId?: string;
  previousAmount?: number;
  newAmount?: number;
  skippedReason?: 'no_payback' | 'manual_cost_basis' | 'already_finalized' | 'update_failed';
};

// 실 소진액 upsert 후, 같은 (계정, period)의 미확정 정산을 새 금액으로 재계산한다.
// confirmed/paid(확정·지급 완료)와 cost_basis='manual'(어드민 수동 조정)은 절대 자동 갱신하지 않는다.
async function reconcilePayback(adAccountId: string, period: string, spend: number): Promise<ReconcileOutcome> {
  const { data: payback } = await supabaseAdmin
    .from('paybacks')
    .select('id, amount, cost_basis, status')
    .eq('ad_account_id', adAccountId)
    .eq('period', period)
    .maybeSingle();

  if (!payback) return { attempted: false, updated: false, skippedReason: 'no_payback' };
  if (payback.cost_basis === 'manual') {
    return { attempted: false, updated: false, paybackId: payback.id, skippedReason: 'manual_cost_basis' };
  }
  if (payback.status === 'confirmed' || payback.status === 'paid') {
    return { attempted: false, updated: false, paybackId: payback.id, skippedReason: 'already_finalized' };
  }

  return applyRecalculatedAmount(adAccountId, spend, payback);
}

async function applyRecalculatedAmount(
  adAccountId: string,
  spend: number,
  payback: { id: string; amount: number }
): Promise<ReconcileOutcome> {
  const { data: account } = await supabaseAdmin
    .from('ad_accounts')
    .select('payback_rate')
    .eq('id', adAccountId)
    .maybeSingle();
  const newAmount = Math.round((spend * (account?.payback_rate ?? 0)) / 100);

  const { error: updateError } = await supabaseAdmin
    .from('paybacks')
    .update({ amount: newAmount, cost_basis: 'verified' })
    .eq('id', payback.id);

  if (updateError) {
    return { attempted: true, updated: false, paybackId: payback.id, skippedReason: 'update_failed' };
  }
  return { attempted: true, updated: true, paybackId: payback.id, previousAmount: payback.amount, newAmount };
}

// 어드민 전용 — 계정별 확인된 월 광고비 입력 이력.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  const { data, error } = await supabaseAdmin
    .from('ad_account_monthly_spend')
    .select('*')
    .eq('ad_account_id', params.id)
    .order('period', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '월별 광고비 내역을 불러오지 못했습니다' }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

// 어드민 전용 — 확인된 월 광고비를 upsert. (ad_account_id, period) 단위 유니크.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  const { body: rawBody, error: parseError } = await parseJsonBody(req);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }
  if (typeof rawBody !== 'object' || rawBody === null) {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다' }, { status: 400 });
  }

  const body = rawBody as Record<string, unknown>;
  const period = validatePeriod(body.period);
  if (!period) {
    return NextResponse.json({ error: 'period는 YYYY-MM 형식이어야 합니다' }, { status: 400 });
  }
  const spend = validateSpend(body.spend_vat_excluded);
  if (spend === null) {
    return NextResponse.json({ error: '광고비는 0 이상의 정수여야 합니다' }, { status: 400 });
  }

  if (!(await ensureAdAccountExists(params.id))) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }

  const upsertRow: MonthlySpendUpsert = {
    ad_account_id: params.id,
    period,
    spend_vat_excluded: spend,
    entered_by: actorUserId(sessionUser),
    updated_at: new Date().toISOString(),
  };

  // updated_at은 Insert 타입엔 없지만(주석 참고) 런타임 페이로드에는 그대로 실려 upsert 시 갱신된다.
  const insertShape = upsertRow as Database['public']['Tables']['ad_account_monthly_spend']['Insert'];
  const { data, error } = await supabaseAdmin
    .from('ad_account_monthly_spend')
    .upsert(insertShape, { onConflict: 'ad_account_id,period' })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '월별 광고비 저장에 실패했습니다' }, { status: 500 });
  }

  const reconcile = await reconcilePayback(params.id, period, spend);
  return NextResponse.json({ entry: data, reconcile });
}
