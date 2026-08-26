# PLAN: 팀 구매 전면 개편 (team_buy_revamp)

작성: 2026-08-26 · 오케스트레이터: po(fable) · 진행: discuss → plan → execute → verify

## 목표

방장(개인 딜 생성) 모델을 폐기하고 **어드민 운영형 공동구매**로 전환한다.
- 딜 생성/편집/취소는 어드민 전용. 사장님은 참여(포인트 결제)만.
- 하드코딩 목업 전부 제거, 실 DB 기반 실가동.
- 참여는 2단계 확인(참여정보 확인 → 최종 확인) 후 포인트 결제.
- 어드민이 딜별 신청자(사장님)·수량·상태·결제이력을 보고 개별 취소(환불)할 수 있다.
- 썸네일 이미지 업로드 + 카드/상세 이미지 확대.

## 실측 기반 현황 (2026-08-26, service role REST 검증)

- `team_deals` 0행 / `team_deal_members` 0행 — 현재 화면의 딜은 전부 목업 폴백.
- `team_deals`: `leader_price` 존재(001, NOT NULL), `thumbnail_url` 없음(42703), `content_html` 없음(42703).
- `team_deal_members`: `is_leader`, `point_transaction_id`, `status('joined'|'refunded')`, `refund_transaction_id` 존재(012 적용 확인).
- RPC `join_team_deal(p_deal_id, p_user_id)` 실 DB 존재 확인(not_found 정상 응답).
- `team_deal_members` RLS on·정책 0건 → anon 클라이언트로 embed 조회 시 빈 배열. 현재 GET이 anon `supabase`를 쓰는 것 자체가 버그 소지 → `supabaseAdmin`으로 전환.
- Storage: 프로젝트 전용 버킷 선례 `business-certificates`(비공개), `receipts`(공개). 팀구매용 버킷 없음 → `team-deal-images`(공개) 신설.
- 업로드 선례: `app/api/business-verification/route.ts` — 매직바이트 검증 + `supabaseAdmin.storage.upload` 패턴 재사용.
- 어드민 API 선례: `app/api/admin/withdrawals/route.ts` — `getSessionUser()` → `isAdmin` 체크 → `forbiddenResponse()`, `usersReadOnlyAdmin`+`resolveBusinessName`으로 신청자 상호명 해석.
- 포인트 잔액: `GET /api/points/summary` 재사용(2단계 확인 화면의 잔액 표시).
- 기존 조인 응답 버그: join 라우트는 `completed`를 주는데 프론트는 `data.status`/`data.target_count`(undefined)를 읽음 → 개편에서 함께 수정.

## 그레이존 결정 (discuss 결과)

| 항목 | 결정 | 근거 |
|---|---|---|
| 수량 개념 | **도입**. `team_deal_members.quantity int not null default 1` 추가, RPC에 `p_quantity int default 1` 파라미터 추가(기존 시그니처 하위호환). 유저당 1행 유지(unique 유지), 수량은 행 안의 값. 차감액 = deal_price × quantity, current_count는 quantity만큼 증가 | 요구사항 원문에 "주문한 수량" 명시 |
| leader_price / is_leader | **DB 컬럼 유지, 앱에서 완전 배제**. `leader_price`는 NOT NULL 해제(비파괴 완화)하고 어드민 insert에서 미전송 | 파괴적 마이그레이션 금지 원칙 |
| 신청 상태 | `team_deal_members.status`에 **'cancelled' 추가**(joined/refunded/cancelled). 어드민 개별 취소 = 원자 RPC로 환불 트랜잭션 기록 + 카운트 감소 | 어드민 상태 관리 요구 충족, 기존 refunded(마감실패 일괄환불)와 구분 |
| 썸네일 | 신규 공개 버킷 `team-deal-images`, 어드민 전용 업로드 API. `team_deals.thumbnail_url text` 추가 | 공유 DB의 타 프로젝트 버킷 오염 방지 |

추가 결정: `team_deals.content_html text` 컬럼 신설(실 DB에 없음 — 상세 본문·어드민 HTML 편집이 목업으로만 존재했음). 딜 상태 'cancelled'는 team_deals CHECK에 이미 존재(001) → 어드민 딜 취소 시 참여자 전원 환불.

## 실행 계획 (원자 커밋 단위)

### Phase 1 — migration 018 + 실 DB 적용
`migrations/018_team_deal_admin_revamp.sql` (전부 추가형, 011/012 스타일 실측 주석):
1. `team_deals`: `thumbnail_url text`, `content_html text` 추가. `leader_price` NOT NULL 해제.
2. `team_deal_members`: `quantity integer not null default 1 check (quantity >= 1)` 추가. status CHECK를 `('joined','refunded','cancelled')`로 교체(제약 교체는 데이터 비파괴).
3. `join_team_deal(p_deal_id, p_user_id, p_quantity int default 1)`로 재작성: 잔여좌석(`target_count - current_count >= p_quantity`) 검증, 차감액 `deal_price * p_quantity`, 카운트 `+ p_quantity`.
4. `cancel_team_deal_member(p_member_id uuid)` 신설: 행잠금 → status='joined' 확인 → 'cancelled' 전환 → refund 포인트 트랜잭션 insert(`price_paid` 전액) → `refund_transaction_id` 기록 → `current_count - quantity`, completed였고 마감 전이며 목표 미달이 되면 'active' 복귀.
5. Storage 버킷 `team-deal-images`(public) 생성 — Storage API로 별도 처리(SQL 아님).
실 DB 적용: Supabase Management API(SQL) — 적용 후 REST로 컬럼/RPC 실측 재확인.

### Phase 2 — 백엔드 API
- `app/api/team-deals/route.ts`: **POST 삭제**, MOCK_DEALS/DEAL_1_HTML 삭제. GET을 `supabaseAdmin`으로 전환, `status='active'` 딜 + `my_membership`(세션 유저의 quantity/status) 포함. DB 에러는 500 + 명확한 메시지(목업 폴백 금지).
- `app/api/team-deals/[id]/route.ts` 신설(GET): 단일 딜 + content_html + my_membership.
- `app/api/team-deals/[id]/join/route.ts`: body `{ quantity }` 수용(1~잔여석 검증), RPC에 전달. 응답에 `new_count/completed/price_paid` 유지.
- 어드민 API 신설 (`getSessionUser().isAdmin` 게이트, withdrawals 패턴):
  - `GET/POST /api/admin/team-deals` — 전 상태 목록(참여 집계 포함) / 딜 생성(leader_price 미전송).
  - `PATCH /api/admin/team-deals/[id]` — 편집(target_count ≥ current_count 검증), `action:'cancel'`로 딜 취소(전 참여자 `cancel_team_deal_member` 순회 환불 후 status='cancelled').
  - `GET /api/admin/team-deals/[id]/members` — 신청자 목록: 상호명(resolveBusinessName)·email·quantity·price_paid·status·joined_at·환불 트랜잭션.
  - `POST /api/admin/team-deals/[id]/members/[memberId]/cancel` — 개별 취소(RPC 호출).
  - `POST /api/admin/team-deals/upload` — 썸네일 업로드(매직바이트 jpeg/png/webp 검증, business-verification 패턴), 공개 URL 반환.

### Phase 3 — 사용자 프론트
- `app/(app)/team-buy/page.tsx`: "딜 만들기" 버튼·생성 모달·handleCreate 전부 삭제. DealCard 썸네일을 이미지 우선(`thumbnail_url`, 없으면 카테고리 이모지 폴백)으로 확대(h-32 → h-44 내외). 내 참여 배지("참여함 · N개") 표시, 참여 딜은 버튼 상태 구분. 빈 상태 문구에서 "직접 만들어보세요" 제거.
- `app/(app)/team-buy/[id]/page.tsx`: 신설 GET [id] 사용. "방장 특별가" 블록 삭제. 썸네일 이미지 확대. **2단계 참여 플로우**: 참여하기 → 확인 시트(수량 선택, 상품가×수량, 보유 포인트(`/api/points/summary`), 차감 후 잔액, 부족 시 버튼 비활성+안내) → "N P 결제하고 참여 확정" → join API. 서버 에러 메시지(`data.error`) 그대로 노출. 참여 완료 후 "내 참여 현황" 배너(수량·결제 포인트·상태) 상시 표시.
- `components/modals/TeamBuyModals.tsx` 삭제(미참조 죽은 코드, grep 재확인 후).

### Phase 4 — 어드민 프론트
- `app/admin/team-deals/page.tsx` 전면 재작성: INITIAL_MOCK/로컬 state 폐기 → 실 API CRUD. 테이블(제목/썸네일/모집현황/상태/마감/신청자 수) + 생성·편집 모달(썸네일 업로드 필드, 방장가 필드 제거, content_html 편집 유지) + 딜 취소(전원 환불 confirm) + 행 확장/모달로 신청자 목록(상호명·수량·결제P·상태·개별 취소 버튼).

### Phase 5 — 검증 (verify-work)
- `npx tsc --noEmit` 0 에러(팀구매 관련).
- 로컬 서버 + 실 API 스모크: 어드민 생성→목록 노출→참여(2단계)→어드민 신청자 조회→개별 취소 환불→포인트 원장 정합(redeem/refund 합계 0) 확인. 테스트 데이터는 명시적 테스트 딜만 사용, cleanup 전 실데이터 여부 재확인(과거 사고 재발 방지).
- `.planning/VERIFICATION_team_buy_revamp.md` 작성, Match Rate ≥ 90%.

## 성공 기준
- [ ] 사용자 화면에서 딜 생성 경로 0개, 방장 표기 0개
- [ ] `MOCK_DEALS`/`INITIAL_MOCK`/`PLACEHOLDER_HTML`/`DEAL_1_HTML` 전부 삭제
- [ ] 어드민에서 생성한 딜이 새로고침·사용자 화면에 실반영
- [ ] 참여는 확인 화면 경유로만 가능, 포인트 부족 시 사전 차단
- [ ] 어드민 신청자 목록에 상호명·수량·상태·결제P 표시, 개별 취소 시 전액 환불 원장 기록
- [ ] 마이그레이션 전부 추가형, 실 DB 적용 실측 확인

## 리스크
- 공유 DB(`nbfoifegbamvtwffbuxv`): DDL은 team_deal 계열 테이블·신규 버킷에만 한정. users 등 공유 테이블 무변경.
- RPC 시그니처 변경: `create or replace`는 인자 수가 다르면 **오버로드를 새로 만들어** PostgREST 호출이 모호해진다(PGRST203). 기존 2-인자 `join_team_deal(uuid, uuid)`를 `drop function`으로 제거하고 3-인자(`p_quantity int default 1`) 단일 정의로 재생성한다. 같은 마이그레이션 안에서 즉시 재생성하므로 무중단·비파괴.
- `refundFailedTeamDeals()`는 price_paid 전액 환불이라 수량 도입과 자동 정합(행당 총액 저장).
