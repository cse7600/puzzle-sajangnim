import type { Database } from '@/types/database';

type VerificationUpdate = Database['public']['Tables']['business_verifications']['Update'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_ADDRESS_MAX_LENGTH = 200;

// 세금계산서 이메일/사업장 주소/네이버 플레이스 URL만 다루는 화이트리스트.
// status/reviewer_note/reviewed_at/business_number/certificate_path는 절대 건드리지 않는다 —
// 이 3개 부가 정보 수정이 승인(approved) 상태를 pending으로 되돌리면 안 되기 때문.
export interface BusinessInfoPatchBody {
  tax_invoice_email?: string;
  business_address?: string;
  naver_place_url?: string;
}

function isNaverHost(hostname: string): boolean {
  return hostname === 'naver.com' || hostname.endsWith('.naver.com') || hostname === 'naver.me';
}

function validateTaxInvoiceEmail(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.tax_invoice_email = null;
    return null;
  }
  if (!EMAIL_PATTERN.test(value)) {
    return '세금계산서 이메일 형식이 올바르지 않습니다';
  }
  update.tax_invoice_email = value;
  return null;
}

function validateBusinessAddress(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.business_address = null;
    return null;
  }
  const trimmed = value.trim().slice(0, BUSINESS_ADDRESS_MAX_LENGTH);
  update.business_address = trimmed;
  return null;
}

function validateNaverPlaceUrl(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.naver_place_url = null;
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return '네이버 플레이스 URL 형식이 올바르지 않습니다';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '네이버 플레이스 URL 형식이 올바르지 않습니다';
  }
  if (!isNaverHost(parsed.hostname)) {
    return '네이버 플레이스 URL만 등록할 수 있습니다';
  }
  update.naver_place_url = value;
  return null;
}

export function validateBusinessInfoPatch(
  body: BusinessInfoPatchBody
): { update: VerificationUpdate; error: string | null } {
  const update: VerificationUpdate = {};

  if (body.tax_invoice_email !== undefined) {
    const error = validateTaxInvoiceEmail(update, body.tax_invoice_email);
    if (error) return { update, error };
  }
  if (body.business_address !== undefined) {
    const error = validateBusinessAddress(update, body.business_address);
    if (error) return { update, error };
  }
  if (body.naver_place_url !== undefined) {
    const error = validateNaverPlaceUrl(update, body.naver_place_url);
    if (error) return { update, error };
  }

  return { update, error: null };
}

export function hasBusinessInfoField(body: Record<string, unknown>): boolean {
  return 'tax_invoice_email' in body || 'business_address' in body || 'naver_place_url' in body;
}
