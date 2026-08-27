-- 지원사업이 새로 들어올 때마다(기업마당 API든 향후 다른 출처든) 자격조건(매출상한/업종제한)을
-- 사람이 일일이 읽고 입력하지 않고 LLM으로 1차 추출한 뒤, 사람이 검수했는지 상태로 구분한다.
-- pending: 아직 분석 전(신규 행 기본값) / ai_suggested: LLM이 텍스트에서 추출함, 미검수
-- / admin_reviewed: 어드민이 확인·수정해서 저장함(신뢰도 최상)
alter table public.gov_support_listings
  add column if not exists curation_status text not null default 'pending'
    check (curation_status in ('pending', 'ai_suggested', 'admin_reviewed')),
  add column if not exists curated_at timestamptz;

create index if not exists gov_support_listings_curation_status_idx
  on public.gov_support_listings (curation_status);

-- 이미 사람이 직접 채운 3건(관광/수출/혁신바우처)은 admin_reviewed로 표시(방금 전 작업에서 검증된 값).
update public.gov_support_listings
set curation_status = 'admin_reviewed', curated_at = now()
where pblanc_id in ('manual-tourism-voucher', 'manual-export-voucher', 'manual-innovation-voucher');
