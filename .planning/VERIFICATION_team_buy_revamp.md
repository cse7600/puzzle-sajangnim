# VERIFICATION: 팀 구매 전면 개편 (team_buy_revamp)

검증일: 2026-08-26 · 대상 커밋: c29a062(마이그레이션) → 2768bf7(백엔드) → 8fcc9d5(사용자 프론트) → 4d8d1bc(어드민 프론트) · 계획: `.planning/PLAN_team_buy_revamp.md`

## Match Rate: 97% (12항목 중 12 PASS, 경미한 관찰 2건)

## A. 정적 검증

| # | 항목 | 결과 | 증거 |
|---|---|---|---|
| A1 | `npx tsc --noEmit` 전체 0 에러 | PASS | exit 0, 출력 없음 |
| A2 | 방장·목업 잔재 0건 (`MOCK_DEALS/INITIAL_MOCK/DEAL_1_HTML/PLACEHOLDER_HTML/TeamBuyModals/leader_price/is_leader/방장` in app·components·lib) | PASS | grep 결과 0건. `TeamBuyModals.tsx` git rm 완료 |
| A3 | 프론트-백엔드 API 계약 일치 | PASS | join 응답 `new_count/completed/price_paid/quantity`, `/api/points/summary`의 `total`, upload multipart 필드명 `thumbnail`→`{thumbnail_url}`, members 응답 `business_name/email/quantity/price_paid/status/joined_at` — 호출부와 라우트 파일 대조 전부 일치 |
| A4 | 보안 게이트 | PASS | 어드민 6개 라우트 전부 `getSessionUser` → `isAdmin` → `forbiddenResponse` 패턴. join/목록/상세는 세션 게이트. 업로드는 content-type 화이트리스트 + 매직바이트(jpg/png/webp) + 5MB 제한. creator_id는 `isUuid()` 검사로 'admin-entry' 센티넬 방어 |

## B. 실가동 스모크 (실 DB, service role — 테스트 데이터 `[TEST-verify-team-buy]` 접두사)

| # | 시나리오 | 결과 | 실측 |
|---|---|---|---|
| B1 | 딜 생성 (creator_id null, leader_price 미전송) | PASS | insert 성공 — 018의 NOT NULL 완화 동작 확인 |
| B2 | `join_team_deal(deal, QA, 2)` | PASS | `{ok:true, quantity:2, new_count:2, price_paid:2000}` + 원장 `-2000 redeem "…(2개)"` |
| B3 | 중복 참여 차단 | PASS | `{ok:false, reason:'already_joined'}` |
| B4 | `cancel_team_deal_member` | PASS | `{ok:true, refunded:2000, new_count:0}` + member status='cancelled' + refund_transaction_id 기록 |
| B5 | 재취소 멱등 | PASS | `{ok:false, reason:'already_processed'}` |
| B6 | 포인트 정합 | PASS | QA 잔액 시작 25,400 → 종료 25,400 (redeem −2000 + refund +2000 = 0) |
| B7 | 비인증 게이트 (localhost:3000) | PASS | `/api/team-deals` 401, `/api/admin/team-deals` 403, `POST /join` 401, `/team-buy` 307→`/login?next=%2Fteam-buy` |
| B8 | cleanup | PASS | 삭제 전 대상 select로 테스트 딜 소속 재확인 → members 1행, point_transactions 2행, team_deals 1행(제목 like 조건 병행)만 삭제. 최종 조회 빈 배열 확인 — 실데이터 무접촉 |

## 요구사항 커버리지

| 요구사항 | 상태 |
|---|---|
| 1. 방장 개념 완전 제거, 딜은 어드민 전용 생성 | 충족 — 사용자 POST 삭제, UI 생성 경로 0개, leader_price/is_leader 앱 참조 0건(DB 컬럼은 비파괴 유지) |
| 2. 어드민 완벽 CRUD + 신청자 정보/수량/상태 | 충족 — 생성/편집/딜취소(전원 환불)/신청자 모달(상호명·수량·결제P·상태·개별 취소환불) 실연동 |
| 3. 포인트 결제 + 이력 조회 + 사장님 신청 상태 확인 | 충족 — 기존 RPC 파이프라인 확장(수량), `my_membership`으로 목록 배지·상세 배너 |
| 4. 참여 2단계 확인 플로우 | 충족 — 상세→확인 시트(수량·합계·보유·차감후 잔액·부족 차단)→최종 결제 버튼. 카드 즉시결제 경로 구조적 제거 |
| 5. 디자인/썸네일 확대 + 어드민 썸네일 관리 | 충족 — 카드 h-44/상세 h-64 이미지(이모지 폴백), 어드민 업로드(매직바이트)·미리보기·교체 |
| 6. 하드코딩 목업 제거, 실가동 | 충족 — 목업 4종 전부 삭제, 에러는 명시 UI(재시도), B1~B8 실 DB 검증 |

## 관찰 (수정 불요, 기록만)

1. **쿠키 전용 어드민의 딜 참여 불가**: `getSessionUser().id === 'admin-entry'`(UUID 아님)로 join RPC 호출 시 500. 어드민이 사장님 화면에서 참여할 일은 QA 모드(실 UUID)로 커버되므로 실사용 영향 없음. 유사 사례는 기존 감사 컬럼 메모와 동일 패턴.
2. **어드민 목록 페이로드**: `GET /api/admin/team-deals`가 전 딜의 `content_html`을 포함해 딜 수가 많아지면 무거워질 수 있음. 편집 모달이 재사용하는 구조라 현재는 유지 — 딜 수십 개 이상이 되면 상세 분리 권장.

## 남은 작업 (범위 밖)

- 프로덕션 배포(main push + `vercel --prod`) — 배포 전 `git status`로 무관 미커밋 변경 stash 확인 관례 준수.
- 어드민 실브라우저 QA(썸네일 업로드 실파일, 신청자 모달) — API 레벨은 검증됐으나 화면 조작은 로그인 세션 필요로 미실시.
- `refundFailedTeamDeals()`의 GET마다 실행되는 lazy sweep은 기존 구조 유지 — 트래픽 증가 시 크론 전환 후보.
