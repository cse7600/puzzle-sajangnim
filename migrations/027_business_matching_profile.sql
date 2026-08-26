-- 정부지원사업 매칭에 필요한 사업 프로필 필드 추가 (전부 추가형, DROP 없음)
-- 배경: business_verifications는 지금까지 business_number + 증빙파일만 저장했다.
-- 지원사업 자격 필터링(업종/지역/설립연차/매출/직원수)에 쓸 구조화 필드가 없어 매칭 기능 자체가 불가능했다.
-- 사장님이 /settings에서 직접 입력하는 부가정보로 취급 — 승인(approved) 상태와 무관하게 자유 수정 가능
-- (business_address/tax_invoice_email 등 기존 부가정보 컬럼과 동일한 패턴).

alter table public.business_verifications
  add column if not exists industry_category text,
  add column if not exists founded_date date,
  add column if not exists annual_revenue_krw bigint,
  add column if not exists employee_count integer,
  add column if not exists region_sido text,
  add column if not exists region_sigungu text;

alter table public.business_verifications
  drop constraint if exists business_verifications_annual_revenue_krw_check;
alter table public.business_verifications
  add constraint business_verifications_annual_revenue_krw_check
  check (annual_revenue_krw is null or annual_revenue_krw >= 0);

alter table public.business_verifications
  drop constraint if exists business_verifications_employee_count_check;
alter table public.business_verifications
  add constraint business_verifications_employee_count_check
  check (employee_count is null or employee_count >= 0);

-- RLS는 007에서 이미 활성화·정책 0건(service role 전용) 상태이며 이 컬럼들도 동일 정책을 따른다.
-- 추가 정책 불필요.
