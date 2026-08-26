import type { Database } from '@/types/database';

type VerificationUpdate = Database['public']['Tables']['business_verifications']['Update'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_ADDRESS_MAX_LENGTH = 200;
const BANK_NAME_MAX_LENGTH = 30;
const ACCOUNT_HOLDER_MAX_LENGTH = 50;
// 계좌번호는 은행마다 자릿수·하이픈 표기가 달라 엄격한 포맷을 강제하지 않고, 숫자/하이픈만 허용해
// 공백·특수문자 실수만 걸러낸다.
const ACCOUNT_NUMBER_PATTERN = /^[0-9-]{4,25}$/;
const INDUSTRY_CATEGORY_MAX_LENGTH = 50;
const REGION_SIGUNGU_MAX_LENGTH = 30;
const FOUNDED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ANNUAL_REVENUE_KRW = 1_000_000_000_000; // 1조원 — 소상공인 매칭 용도라 이 이상은 입력 실수로 간주
const MAX_EMPLOYEE_COUNT = 100_000;
const VALID_SIDO = new Set([
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도',
]);

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
  industry_category?: string;
  founded_date?: string;
  annual_revenue_krw?: number | null;
  employee_count?: number | null;
  region_sido?: string;
  region_sigungu?: string;
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

function validateIndustryCategory(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.industry_category = null;
    return null;
  }
  update.industry_category = value.trim().slice(0, INDUSTRY_CATEGORY_MAX_LENGTH);
  return null;
}

function validateFoundedDate(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.founded_date = null;
    return null;
  }
  if (!FOUNDED_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    return '설립일은 YYYY-MM-DD 형식으로 입력해주세요';
  }
  // UTC 자정 기준으로 비교하면 KST 00~09시엔 "오늘" 날짜가 미래로 오판된다 — KST로 보정해서 비교
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (value > todayKst) {
    return '설립일은 미래 날짜일 수 없습니다';
  }
  update.founded_date = value;
  return null;
}

function validateAnnualRevenue(update: VerificationUpdate, value: number | null): string | null {
  if (value === null) {
    update.annual_revenue_krw = null;
    return null;
  }
  if (!Number.isInteger(value) || value < 0 || value > MAX_ANNUAL_REVENUE_KRW) {
    return '연매출은 0 이상의 정수(원 단위)로 입력해주세요';
  }
  update.annual_revenue_krw = value;
  return null;
}

function validateEmployeeCount(update: VerificationUpdate, value: number | null): string | null {
  if (value === null) {
    update.employee_count = null;
    return null;
  }
  if (!Number.isInteger(value) || value < 0 || value > MAX_EMPLOYEE_COUNT) {
    return '직원 수는 0 이상의 정수로 입력해주세요';
  }
  update.employee_count = value;
  return null;
}

function validateRegionSido(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.region_sido = null;
    return null;
  }
  if (!VALID_SIDO.has(value)) {
    return '시/도 값이 올바르지 않습니다';
  }
  update.region_sido = value;
  return null;
}

function validateRegionSigungu(update: VerificationUpdate, value: string): string | null {
  if (value === '') {
    update.region_sigungu = null;
    return null;
  }
  update.region_sigungu = value.trim().slice(0, REGION_SIGUNGU_MAX_LENGTH);
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
  if (body.industry_category !== undefined) {
    const error = validateIndustryCategory(update, body.industry_category);
    if (error) return { update, error };
  }
  if (body.founded_date !== undefined) {
    const error = validateFoundedDate(update, body.founded_date);
    if (error) return { update, error };
  }
  if (body.annual_revenue_krw !== undefined) {
    const error = validateAnnualRevenue(update, body.annual_revenue_krw);
    if (error) return { update, error };
  }
  if (body.employee_count !== undefined) {
    const error = validateEmployeeCount(update, body.employee_count);
    if (error) return { update, error };
  }
  if (body.region_sido !== undefined) {
    const error = validateRegionSido(update, body.region_sido);
    if (error) return { update, error };
  }
  if (body.region_sigungu !== undefined) {
    const error = validateRegionSigungu(update, body.region_sigungu);
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
    'account_holder' in body ||
    'industry_category' in body ||
    'founded_date' in body ||
    'annual_revenue_krw' in body ||
    'employee_count' in body ||
    'region_sido' in body ||
    'region_sigungu' in body
  );
}
