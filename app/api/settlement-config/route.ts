import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
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

// 어드민 전용 — 정산 마감일(기본 10일) 변경.
export async function PATCH(req: NextRequest) {
  const body = await req.json() as { settlement_day?: number };
  const day = body.settlement_day;

  if (!Number.isInteger(day) || day! < 1 || day! > 28) {
    return NextResponse.json({ error: 'settlement_day는 1~28 사이 정수여야 합니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('settlement_settings')
    .update({ settlement_day: day, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: '정산 마감일 변경에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(data);
}
