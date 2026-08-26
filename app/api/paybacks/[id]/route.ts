import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { PAYBACK_STATUSES, PaybackStatus, WithdrawalStatus } from '@/lib/hub';
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId, SessionUser } from '@/lib/auth-server';
import { awardReferralCommission } from '@/lib/points';

type PaybackUpdate = Database['public']['Tables']['paybacks']['Update'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PatchBody {
  scheduled_pay_date?: string;
  status?: string;
  amount?: number;
}

async function getWithdrawalDeadlineDays(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('settlement_settings')
    .select('withdrawal_deadline_days')
    .eq('id', 1)
    .maybeSingle();
  return data?.withdrawal_deadline_days ?? 7;
}

async function hasWithdrawalWithStatus(paybackId: string, statuses: WithdrawalStatus[]): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id')
    .eq('payback_id', paybackId)
    .in('status', statuses)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// status 전환에 따라 감사(audit) 컬럼을 관리자 세션 정보로 채운다.
// confirmed 전이 시 출금 신청 기한(withdrawal_deadline)도 이 시점에 어드민 설정값 기준으로 스탬프한다.
async function stampStatusAudit(update: PaybackUpdate, status: PaybackStatus, sessionUser: SessionUser): Promise<void> {
  const actorId = actorUserId(sessionUser);
  const now = new Date().toISOString();

  if (status === 'review_1') {
    update.reviewed_by_1 = actorId;
    update.reviewed_at_1 = now;
  } else if (status === 'review_2') {
    update.reviewed_by_2 = actorId;
    update.reviewed_at_2 = now;
  } else if (status === 'confirmed') {
    update.confirmed_by = actorId;
    update.confirmed_at = now;
    const deadlineDays = await getWithdrawalDeadlineDays();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);
    update.withdrawal_deadline = deadline.toISOString();
  } else if (status === 'paid') {
    update.processed_at = now;
  }
}

// paid/converted_to_points는 종결 상태 — 이후 변경 불가(되돌리려면 신규 정산 발행이 원칙, 원장 append-only).
// confirmed → paid 직행도 차단한다: 정본 지급 경로는 어드민 출금 API이며,
// 그 API가 withdrawal.status=processing 확인 후 순서대로 처리한다.
async function validateStatusTransition(
  paybackId: string,
  currentStatus: PaybackStatus,
  nextStatus: PaybackStatus
): Promise<string | null> {
  if (currentStatus === 'paid' || currentStatus === 'converted_to_points') {
    return '이미 종결된 정산 건은 상태를 변경할 수 없습니다';
  }
  if (nextStatus === 'paid') {
    const hasProcessing = await hasWithdrawalWithStatus(paybackId, ['processing']);
    if (!hasProcessing) {
      return '활성 출금 신청 없이 지급 처리할 수 없습니다. 출금 관리 화면에서 처리하세요';
    }
  }
  return null;
}

// 활성 출금 신청(신청 접수~지급완료)이 있는 건의 금액을 바꾸면 지급액과 신청 스냅샷이 어긋난다.
async function validateAmountChange(paybackId: string): Promise<string | null> {
  const hasActive = await hasWithdrawalWithStatus(paybackId, ['requested', 'processing', 'paid']);
  if (hasActive) {
    return '진행 중인 출금 신청이 있습니다. 먼저 반려한 뒤 금액을 수정하세요';
  }
  return null;
}

function applyScheduledPayDate(update: PaybackUpdate, value: string): string | null {
  if (!DATE_PATTERN.test(value)) {
    return '지급 예정일은 YYYY-MM-DD 형식이어야 합니다';
  }
  update.scheduled_pay_date = value;
  return null;
}

async function applyStatus(update: PaybackUpdate, value: string, sessionUser: SessionUser): Promise<string | null> {
  if (!PAYBACK_STATUSES.includes(value as PaybackStatus)) {
    return '잘못된 status 값입니다';
  }
  const status = value as PaybackStatus;
  update.status = status;
  await stampStatusAudit(update, status, sessionUser);
  return null;
}

function applyAmount(update: PaybackUpdate, value: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return '금액은 0 이상의 정수여야 합니다';
  }
  update.amount = value;
  update.cost_basis = 'manual';
  return null;
}

// 어드민 전용 — 정산 상태/지급 예정일/금액 개별 조정.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 });
  }

  const { data: current } = await supabaseAdmin.from('paybacks').select('status').eq('id', params.id).maybeSingle();
  if (!current) {
    return NextResponse.json({ error: '정산 내역을 찾을 수 없습니다' }, { status: 404 });
  }
  const currentStatus = current.status as PaybackStatus;

  if (body.status !== undefined) {
    const transitionError = await validateStatusTransition(params.id, currentStatus, body.status as PaybackStatus);
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 });
  }
  if (body.amount !== undefined) {
    const amountError = await validateAmountChange(params.id);
    if (amountError) return NextResponse.json({ error: amountError }, { status: 409 });
  }

  const update: PaybackUpdate = {};
  if (body.scheduled_pay_date !== undefined) {
    const error = applyScheduledPayDate(update, body.scheduled_pay_date);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  if (body.status !== undefined) {
    const error = await applyStatus(update, body.status, sessionUser);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  if (body.amount !== undefined) {
    const error = applyAmount(update, body.amount);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('paybacks')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '정산 내역을 찾을 수 없습니다' }, { status: 404 });
    }
    return NextResponse.json({ error: '정산 내역 수정에 실패했습니다' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '정산 내역을 찾을 수 없습니다' }, { status: 404 });
  }

  // confirmed로 처음 전이되는 시점에만 추천인 커미션을 1회 지급한다(금액 스냅샷).
  // 이후 amount만 수정되는 PATCH는 currentStatus가 이미 'confirmed'라 재발화하지 않는다.
  if (body.status === 'confirmed' && currentStatus !== 'confirmed') {
    await awardReferralCommission({
      refereeId: data.user_id,
      sourceType: 'payback',
      sourceAmount: data.amount,
      referenceId: data.id,
    });
  }

  return NextResponse.json(data);
}
