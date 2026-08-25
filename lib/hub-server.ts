import { supabaseAdmin } from '@/lib/supabase-admin';
import { Platform } from '@/lib/hub';
import type { Database, Json } from '@/types/database';

type AdAccountRow = Database['public']['Tables']['ad_accounts']['Row'];
export interface AdAccountWithBusinessNumber extends AdAccountRow {
  business_number: string | null;
}

/**
 * api_credentials를 마지막 4자만 남기고 마스킹한다.
 * 광고계정 row를 클라이언트로 내보내는 모든 라우트(GET/PATCH/confirm-transfer/cancel-transfer)가
 * 이 헬퍼 하나만 거치도록 해서 마스킹 로직이 라우트마다 따로 복붙되는 것을 막는다.
 */
export function maskAdAccountCredentials<T extends { api_credentials: Json }>(
  row: T
): Omit<T, 'api_credentials'> & { api_credentials: Record<string, string> } {
  const credentials = row.api_credentials as Record<string, string> | null;
  const maskedCredentials = Object.fromEntries(
    Object.entries(credentials ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' && value.length > 4 ? `${'*'.repeat(value.length - 4)}${value.slice(-4)}` : '****',
    ])
  );
  const { api_credentials: _apiCredentials, ...rest } = row;
  return { ...rest, api_credentials: maskedCredentials } as Omit<T, 'api_credentials'> & { api_credentials: Record<string, string> };
}

export async function getSettlementDay(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('settlement_settings')
    .select('settlement_day')
    .eq('id', 1)
    .single();
  return data?.settlement_day ?? 10;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOfId: string | null;
}

/** 같은 (platform, account_id)가 다른 유저로 이미 등록돼 있으면 중복으로 판정. */
export async function checkDuplicateAccount(
  platform: Platform,
  accountId: string,
  currentUserId: string
): Promise<DuplicateCheckResult> {
  const { data } = await supabaseAdmin
    .from('ad_accounts')
    .select('id, user_id')
    .eq('platform', platform)
    .eq('account_id', accountId)
    .neq('user_id', currentUserId)
    .limit(1)
    .maybeSingle();

  if (!data) return { isDuplicate: false, duplicateOfId: null };
  return { isDuplicate: true, duplicateOfId: data.id };
}

/**
 * 어드민 광고계정 목록에 신청자의 사업자 등록번호를 붙인다.
 * business_verifications는 유저당 여러 건일 수 있어 submitted_at 최신 값만 사용한다.
 * RLS 보호 테이블이므로 반드시 supabaseAdmin(service_role)으로만 조회한다.
 */
export async function attachBusinessNumbers(
  accounts: AdAccountRow[]
): Promise<AdAccountWithBusinessNumber[]> {
  const userIds = Array.from(new Set(accounts.map(a => a.user_id)));
  if (userIds.length === 0) return [];

  const { data: verifications } = await supabaseAdmin
    .from('business_verifications')
    .select('user_id, business_number, submitted_at')
    .in('user_id', userIds)
    .order('submitted_at', { ascending: false });

  const latestByUser = new Map<string, string>();
  for (const v of verifications ?? []) {
    if (!latestByUser.has(v.user_id)) latestByUser.set(v.user_id, v.business_number);
  }

  return accounts.map(a => ({ ...a, business_number: latestByUser.get(a.user_id) ?? null }));
}
