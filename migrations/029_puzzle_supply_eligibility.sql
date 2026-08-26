-- 정부지원사업 매칭의 핵심 두 축: ①지원대상(광고주가 이 사업 대상에 해당하는가 — trgetnm/지역/업종으로
-- 기존에 이미 판단 가능) ②거래가능기업(퍼즐코퍼레이션이 이 사업의 공급기업/수행기관으로 등록돼 있어
-- 실제로 대행 가능한가 — 지금까지 스키마에 전혀 없었다). 후자를 어드민이 직접 관리하는 컬럼으로 추가한다.
--
-- 주의: collect-gov-support.mjs의 일 1회 upsert 페이로드에는 이 컬럼이 없으므로, PostgREST가
-- 페이로드에 없는 컬럼은 건드리지 않는다 — 어드민이 표시해둔 값이 매일 자동수집으로 리셋되지 않는다.

alter table public.gov_support_listings
  add column if not exists is_puzzle_transactable boolean not null default false,
  add column if not exists puzzle_note text;

create index if not exists gov_support_listings_puzzle_transactable_idx
  on public.gov_support_listings (is_puzzle_transactable) where is_puzzle_transactable;

-- 리서치로 확인된, 퍼즐코퍼레이션이 이미 공급기업으로 등록된 4개 바우처 사업을 수동 큐레이션으로 시딩.
-- bizinfo API 라이브 피드엔 연초 공고·마감 사이클 때문에 안 잡힌다(실측 확인, 2026-08-26).
-- 기술사업화패키지는 퍼즐의 정확한 등록 역할(공급기업 vs 전담기관)이 미확인이라 거래가능=false로 보수적으로 둔다.
insert into public.gov_support_listings
  (pblanc_id, title, url, jrsdinsttnm, trgetnm, lclas_nm, hashtags, summary, is_marketing, is_puzzle_transactable, puzzle_note, source, updated_at)
values
  ('manual-tourism-voucher', '관광기업 혁신바우처', 'https://www.tourvoucher.or.kr/index.do', '문화체육관광부·한국관광공사', '관광사업체 등록 소상공인', '내수', array['관광','마케팅','바우처'], '디지털 마케팅, SNS 콘텐츠 제작·홍보 등 관광기업 대상 바우처. 소상공인이 tourvoucher.or.kr에서 공급기업으로 퍼즐 선택 가능.', true, true, '퍼즐코퍼레이션 공급기업 등록 완료', 'manual', now()),
  ('manual-export-voucher', '수출바우처(수출지원기반활용사업)', 'https://www.exportvoucher.com/portal/menupan/menu', 'KOTRA·중진공·OKTA', '수출 준비 중소·중견기업', '수출', array['수출','마케팅','바우처'], '해외광고·브랜드개발·현지화 콘텐츠 등 14개 분야 서비스. exportvoucher.com에서 퍼즐 서비스 검색·선택 가능.', true, true, '퍼즐코퍼레이션 공급기업 등록 완료', 'manual', now()),
  ('manual-innovation-voucher', '중소기업 혁신바우처', 'https://www.mssmiv.com/portal/apply/ApplyPeformMain', '중소벤처기업진흥공단', '제조업 소기업(3년평균매출 140억 이하)', '내수', array['혁신','마케팅','바우처'], 'BI/CI·카탈로그·홍보영상·온오프라인광고. 대상이 제조업 소기업 한정이라 서비스업 소상공인은 해당 안 될 수 있음.', true, true, '퍼즐코퍼레이션 공급기업 등록 완료 — 단, 대상이 제조업 소기업 한정', 'manual', now()),
  ('manual-tech-commercialization', '기술사업화패키지', null, '중소벤처기업부·TIPA', '정부 R&D 완료 중소기업', '기술', array['기술사업화','마케팅'], '마케팅·브랜드·해외인증 등 메뉴판 선택형 사업화 지원.', true, false, '퍼즐 등록 여부/역할(공급기업 vs 전담기관) 확인 필요 — 확정 전까지 거래가능 표시 보류', 'manual', now())
on conflict (pblanc_id) do update set
  title = excluded.title, url = excluded.url, jrsdinsttnm = excluded.jrsdinsttnm,
  trgetnm = excluded.trgetnm, lclas_nm = excluded.lclas_nm, hashtags = excluded.hashtags,
  summary = excluded.summary, is_marketing = excluded.is_marketing,
  is_puzzle_transactable = excluded.is_puzzle_transactable, puzzle_note = excluded.puzzle_note,
  source = excluded.source, updated_at = now();
