-- 정산 지급을 위한 정산 계좌 정보(은행/계좌번호/예금주/통장사본) 수집.
-- business_verifications의 기존 부가 정보(tax_invoice_email/business_address/naver_place_url)와
-- 동일한 패턴: 사업자당 1건, 승인(approved) 상태를 건드리지 않고 사용자·어드민 모두 수정 가능.
-- 전부 추가형. DROP COLUMN 없음.

alter table public.business_verifications
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists account_holder text,
  -- 통장사본 이미지는 계좌번호와 마찬가지로 민감 정보이므로 별도 private 버킷(bank-accounts)에
  -- 저장하고 이 컬럼엔 경로만 보관한다. certificate_path와 동일한 패턴.
  add column if not exists bankbook_copy_path text;

-- Storage: bank-accounts 버킷(private)은 이 마이그레이션 적용 시 함께 수동 생성했다
-- (POST {url}/storage/v1/bucket, public:false — business-certificates와 동일 패턴).
-- RLS는 007/008과 동일한 이유로 business_verifications 테이블에 이미 걸려 있고 정책은 없다 —
-- 앱은 supabaseAdmin(service_role) 경유로만 접근한다.
