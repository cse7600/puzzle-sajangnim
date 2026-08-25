import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';

type PaybackUpdate = Database['public']['Tables']['paybacks']['Update'];

const PAYBACK_STATUSES = ['pending', 'confirmed', 'paid'] as const;

// 어드민 전용 — 지급 예정일/상태 개별 조정. 인증 게이트는 Sprint 2에서 추가 예정.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { scheduled_pay_date?: string; status?: string };
  const update: PaybackUpdate = {};

  if (body.scheduled_pay_date !== undefined) {
    update.scheduled_pay_date = body.scheduled_pay_date;
  }
  if (body.status !== undefined) {
    if (!PAYBACK_STATUSES.includes(body.status as typeof PAYBACK_STATUSES[number])) {
      return NextResponse.json({ error: '잘못된 status 값입니다' }, { status: 400 });
    }
    update.status = body.status as typeof PAYBACK_STATUSES[number];
    if (body.status === 'paid') {
      update.processed_at = new Date().toISOString();
    }
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
    return NextResponse.json({ error: '정산 내역 수정에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(data);
}
