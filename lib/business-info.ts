import type { Database } from '@/types/database';

type VerificationUpdate = Database['public']['Tables']['business_verifications']['Update'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_ADDRESS_MAX_LENGTH = 200;
const BANK_NAME_MAX_LENGTH = 30;
const ACCOUNT_HOLDER_MAX_LENGTH = 50;
// 계좌번호는 은행마다 자릿수·하이픈 표기가 달라 엄격한 포맷을 강제하지 않고, 숫자/하이픈만 허용해
// 공백·특수문자 실수만 걸러낸다.
const ACCOUNT_NUMBER_PATTERN = /^[0-9-]{4,25}$/;

// 세금계산서 이메일/사업장 주소/네이버 플레이스 URL + 정산 계좌 정보만 다루는 화이트리스트.
// status/reviewer_note/reviewed_at/business_number/certificate_path/bankbook_copy_path는
// 절대 건드리지 않는다 — 이 부가 정보 수정이 승인(approved) 상태를 pending으로 되돌리면 안 되고,
// bankbook_copy_path는 파일 업로드 라우트(POST /api/business-verification/bankbook)만 갱신한다.
export interface BusinessInfoPatchBody {
  tax_invoice_email?: string;
  business_address?: string;
  naver_place_url?: string;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
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

function validateBankName(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.bank_name = null;
    return null;
  }
  update.bank_name = value.trim().slice(0, BANK_NAME_MAX_LENGTH);
  return null;
}

function validateAccountNumber(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.account_number = null;
    return null;
  }
  const trimmed = value.trim();
  if (!ACCOUNT_NUMBER_PATTERN.test(trimmed)) {
    return '계좌번호는 숫자와 하이픈만 입력할 수 있습니다';
  }
  update.account_number = trimmed;
  return null;
}

function validateAccountHolder(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.account_holder = null;
    return null;
  }
  update.account_holder = value.trim().slice(0, ACCOUNT_HOLDER_MAX_LENGTH);
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
  if (body.bank_name !== undefined) {
    const error = validateBankName(update, body.bank_name);
    if (error) return { update, error };
  }
  if (body.account_number !== undefined) {
    const error = validateAccountNumber(update, body.account_number);
    if (error) return { update, error };
  }
  if (body.account_holder !== undefined) {
    const error = validateAccountHolder(update, body.account_holder);
    if (error) return { update, error };
  }

  return { update, error: null };
}

export function hasBusinessInfoField(body: Record<string, unknown>): boolean {
  return (
    'tax_invoice_email' in body ||
    'business_address' in body ||
    'naver_place_url' in body ||
    'bank_name' in body ||
    'account_number' in body ||
    'account_holder' in body
  );
}
