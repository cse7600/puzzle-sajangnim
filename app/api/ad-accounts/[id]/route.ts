import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';
import { TRANSFER_STATUSES, CONNECTION_STATUSES, TransferStatus, ConnectionStatus } from '@/lib/hub';
import { maskAdAccountCredentials } from '@/lib/hub-server';

export const dynamic = 'force-dynamic';

type AdAccountUpdate = Database['public']['Tables']['ad_accounts']['Update'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactEmail(update: AdAccountUpdate, value: unknown): string | null {
  if (typeof value !== 'string' || (value !== '' && !EMAIL_PATTERN.test(value))) {
    return '담당자 이메일 형식이 올바르지 않습니다';
  }
  update.contact_email = value === '' ? null : value;
  return null;
}

function validateContactPhone(update: AdAccountUpdate, value: unknown): string | null {
  if (typeof value !== 'string') {
    return '담당자 연락처 형식이 올바르지 않습니다';
  }
  update.contact_phone = value === '' ? null : value;
  return null;
}

function validateTaxInvoiceDirect(update: AdAccountUpdate, value: unknown): string | null {
  if (typeof value !== 'boolean') {
    return '세금계산서 직발행 여부 값이 올바르지 않습니다';
  }
  update.tax_invoice_direct = value;
  return null;
}

function validateTransferStatus(update: AdAccountUpdate, value: unknown): string | null {
  if (!TRANSFER_STATUSES.includes(value as TransferStatus)) {
    return '잘못된 이관 상태 값입니다';
  }
  update.transfer_status = value as TransferStatus;
  return null;
}

function validateConnectionStatus(update: AdAccountUpdate, value: unknown): string | null {
  if (!CONNECTION_STATUSES.includes(value as ConnectionStatus)) {
    return '잘못된 연결 상태 값입니다';
  }
  update.connection_status = value as ConnectionStatus;
  return null;
}

// 화이트리스트에 없는 키는 무시한다 — 요청 본문을 그대로 spread하지 않아 mass-assignment를 막는다.
const FIELD_VALIDATORS: Record<string, (update: AdAccountUpdate, value: unknown) => string | null> = {
  contact_email: validateContactEmail,
  contact_phone: validateContactPhone,
  tax_invoice_direct: validateTaxInvoiceDirect,
  transfer_status: validateTransferStatus,
  connection_status: validateConnectionStatus,
};

function buildAdAccountUpdate(body: Record<string, unknown>): { update: AdAccountUpdate; error: string | null } {
  const update: AdAccountUpdate = {};
  for (const [key, validate] of Object.entries(FIELD_VALIDATORS)) {
    if (!(key in body)) continue;
    const error = validate(update, body[key]);
    if (error) return { update, error };
  }
  return { update, error: null };
}

async function parseJsonBody(req: NextRequest): Promise<{ body: unknown; error: string | null }> {
  try {
    return { body: await req.json(), error: null };
  } catch {
    return { body: null, error: '요청 본문이 올바른 JSON 형식이 아닙니다' };
  }
}

// 어드민 전용. 현재 앱 전체에 로그인 인증이 없어 이 라우트도 미인증 상태 — 감사 로드맵 Sprint 2(인증)에서 해소 예정.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { body: rawBody, error: parseError } = await parseJsonBody(req);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }
  if (typeof rawBody !== 'object' || rawBody === null) {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다' }, { status: 400 });
  }

  const { update, error: validationError } = buildAdAccountUpdate(rawBody as Record<string, unknown>);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
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

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
    }
    return NextResponse.json({ error: '광고계정 정보 수정에 실패했습니다' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json(maskAdAccountCredentials(data));
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('ad_accounts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '광고계정을 찾을 수 없습니다' }, { status: 404 });
  }

  return NextResponse.json(maskAdAccountCredentials(data));
}
