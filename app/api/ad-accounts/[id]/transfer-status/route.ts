import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { TRANSFER_STATUSES, CONNECTION_STATUSES, TransferStatus, ConnectionStatus } from '@/lib/hub';
import { maskAdAccountCredentials } from '@/lib/hub-server';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-server';

type AdAccountUpdate = Database['public']['Tables']['ad_accounts']['Update'];

// 어드민 전용 — 이관/연동 상태를 관리자가 직접 조정.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorizedResponse();
  if (!sessionUser.isAdmin) return forbiddenResponse();

  let body: { transfer_status?: string; connection_status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON 형식이 아닙니다' }, { status: 400 });
  }
  const update: AdAccountUpdate = {};

  if (body.transfer_status) {
    if (!TRANSFER_STATUSES.includes(body.transfer_status as TransferStatus)) {
      return NextResponse.json({ error: '잘못된 transfer_status 값입니다' }, { status: 400 });
    }
    update.transfer_status = body.transfer_status as TransferStatus;
  }
  if (body.connection_status) {
    if (!CONNECTION_STATUSES.includes(body.connection_status as ConnectionStatus)) {
      return NextResponse.json({ error: '잘못된 connection_status 값입니다' }, { status: 400 });
    }
    update.connection_status = body.connection_status as ConnectionStatus;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 값이 없습니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error?.code === 'PGRST116' || !data) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json(maskAdAccountCredentials(data));
}
