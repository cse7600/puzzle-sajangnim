import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { PAYBACK_STATUSES, PaybackStatus } from '@/lib/hub';
import { getSessionUser, unauthorizedResponse, forbiddenResponse, actorUserId, SessionUser } from '@/lib/auth-server';

type PaybackUpdate = Database['public']['Tables']['paybacks']['Update'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PatchBody {
  scheduled_pay_date?: string;
  status?: string;
  amount?: number;
}

// status 전환에 따라 감사(audit) 컬럼을 관리자 세션 정보로 채운다.
function stampStatusAudit(update: PaybackUpdate, status: PaybackStatus, sessionUser: SessionUser): void {
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
  } else if (status === 'paid') {
    update.processed_at = now;
  }
}

function applyScheduledPayDate(update: PaybackUpdate, value: string): string | null {
  if (!DATE_PATTERN.test(value)) {
    return '지급 예정일은 YYYY-MM-DD 형식이어야 합니다';
  }
  update.scheduled_pay_date = value;
  return null;
}

function applyStatus(update: PaybackUpdate, value: string, sessionUser: SessionUser): string | null {
  if (!PAYBACK_STATUSES.includes(value as PaybackStatus)) {
    return '잘못된 status 값입니다';
  }
  const status = value as PaybackStatus;
  update.status = status;
  stampStatusAudit(update, status, sessionUser);
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

function buildPaybackUpdate(body: PatchBody, sessionUser: SessionUser): { update: PaybackUpdate; error: string | null } {
  const update: PaybackUpdate = {};

  if (body.scheduled_pay_date !== undefined) {
    const error = applyScheduledPayDate(update, body.scheduled_pay_date);
    if (error) return { update, error };
  }
  if (body.status !== undefined) {
    const error = applyStatus(update, body.status, sessionUser);
    if (error) return { update, error };
  }
  if (body.amount !== undefined) {
    const error = applyAmount(update, body.amount);
    if (error) return { update, error };
  }

  return { update, error: null };
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

  const { update, error: validationError } = buildPaybackUpdate(body, sessionUser);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
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

  return NextResponse.json(data);
}
