import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('settlement_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: '정산 설정을 불러오지 못했습니다' }, { status: 500 });
  }
  return NextResponse.json(data);
}

interface SettlementConfigPatchBody {
  settlement_day?: number;
  withdrawal_deadline_days?: number;
  withdrawal_min_amount?: number;
}

function validateSettlementConfigPatch(body: SettlementConfigPatchBody): { update: Record<string, unknown>; error: string | null } {
  const update: Record<string, unknown> = {};

  if (body.settlement_day !== undefined) {
    if (!Number.isInteger(body.settlement_day) || body.settlement_day < 1 || body.settlement_day > 28) {
      return { update, error: 'settlement_day는 1~28 사이 정수여야 합니다' };
    }
    update.settlement_day = body.settlement_day;
  }
  if (body.withdrawal_deadline_days !== undefined) {
    if (!Number.isInteger(body.withdrawal_deadline_days) || body.withdrawal_deadline_days < 1 || body.withdrawal_deadline_days > 90) {
      return { update, error: 'withdrawal_deadline_days는 1~90 사이 정수여야 합니다' };
    }
    update.withdrawal_deadline_days = body.withdrawal_deadline_days;
  }
  if (body.withdrawal_min_amount !== undefined) {
    if (!Number.isInteger(body.withdrawal_min_amount) || body.withdrawal_min_amount < 0) {
      return { update, error: 'withdrawal_min_amount는 0 이상의 정수여야 합니다' };
    }
    update.withdrawal_min_amount = body.withdrawal_min_amount;
  }
  return { update, error: null };
}

// 어드민 전용 — 정산 마감일(기본 10일) / 출금 신청 유예기간(기본 7일) / 최소 출금액(기본 1만원) 변경.
export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  const body = await req.json() as SettlementConfigPatchBody;
  const { update, error: validationError } = validateSettlementConfigPatch(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('settlement_settings')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: '정산 설정 변경에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(data);
}
