# VERIFICATION — 정산/수수료 v2 (settlement review + monthly spend)

- 검증일: 2026-08-26
- 검증 방식: 정적 코드 리뷰 + Supabase Management API 실쿼리 + 로컬 프로덕션 빌드(`next build` → `next start`)에 대한 실제 HTTP 호출 + Chrome 실브라우저 렌더 확인
- 검증자 주의: 아래 모든 출력은 실측값을 그대로 붙였다. 추정으로 채운 항목은 "커버리지 갭"에 명시했다.
- DB는 검증 후 베이스라인으로 완전 복원했다(마지막 섹션 참고).

## 요약

| 항목 | 판정 |
|------|------|
| 1. 사업자별 수수료율 + 월별 실 소진액 | PASS |
| 2. 정산 리뷰 워크플로우 (sentinel 포함) | PASS (단, 미들웨어 결함 1건 발견·수정 후) |
| 3. 세금계산서 메일 + 사업장 정보 | PASS |
| 4. 정산 내역 테이블 + 기간 조회 | PASS |
| 5. 정산확정 ↔ 어드민 ↔ 사용자 API 정합성 | PASS |
| tsc | 0 errors |
| next build | 성공 (✓ Compiled successfully) |

## 발견 결함 (심각도순)

### D1 — HIGH (수정함): 쿠키 전용 관리자가 어드민 정산 기능 전체를 사용할 수 없었음
- 위치: `middleware.ts` (수정 전 177–179행)
- 증상: `/admin/login` 공유 비밀번호로 입장한 관리자(Supabase 세션 없음, `admin_entry_session` 쿠키만 보유)가 `/api/admin/*` 밖의 보호 API를 호출하면 미들웨어의 미인증 게이트가 `adminProof`를 무시하고 401을 반환. 어드민 정산 페이지(`/api/paybacks?scope=all`, `/api/settlement-config`, `PATCH /api/paybacks/[id]`, `POST /api/paybacks/generate`)와 어드민 사용자 상세의 수수료율/월별 소진액 패널(`PATCH /api/ad-accounts/[id]`, `GET/POST /api/ad-accounts/[id]/monthly-spend`)이 전부 죽는다. `actorUserId()` sentinel 처리를 라우트마다 넣어둔 설계 의도(쿠키 전용 관리자도 이 라우트들을 쓴다)와 정면 충돌.
- 실측(수정 전):
  ```
  == admin cookie: monthly-spend GET ==   {"error":"로그인이 필요합니다"} HTTP:401
  == admin cookie: paybacks scope=all ==  {"error":"로그인이 필요합니다"} HTTP:401
  == admin cookie: settlement-config ==   {"error":"로그인이 필요합니다"} HTTP:401
  == admin cookie: admin users API ==     HTTP 200 (여기만 /api/admin이라 통과)
  ```
- 수정: `middleware.ts`의 `if (!user)` 분기에 `if (adminProof && isProtectedApi) return supabaseResponse` 1줄 추가(주석 포함). 각 라우트의 `getSessionUser()`가 쿠키를 재검증하고 isAdmin 인가를 다시 수행하므로 권한 상승 없음. 보호 페이지는 기존대로 `/login` 리다이렉트 유지.
- 수정 후 실측: 쿠키 전용 관리자로 `paybacks?scope=all` 200, 비로그인 401 유지, `/hub` 무세션 접근은 여전히 `307 → /login?next=%2Fhub`. 비관리자(QA 유저)는 아래 보안 섹션대로 전부 403 유지.

### D2 — LOW (미수정): 정산서 PDF의 "지급 상태" 헤더가 첫 행 status를 따름
- 위치: `app/api/paybacks/statement/route.tsx:77` — `status: paybacks.every(p => p.status === 'paid') ? 'paid' : paybacks[0].status`
- 사용자 UI(`SettlementTable.leastAdvancedStatus`)는 "가장 덜 진행된 단계"를 월 헤더로 쓰는데, PDF는 조회 순서상 첫 행의 status를 쓴다. 예: 계정 A=confirmed, 계정 B=draft이고 A가 첫 행이면 PDF 헤더는 "확정", 웹 헤더는 "처리중"으로 갈린다. 사용자 노출 라벨이 `PAYBACK_USER_STATUS_LABEL`이라 내부 단계 유출은 없고, 금액은 항상 일치하므로 심각도 낮음. 이번 실측(2099-01, draft+confirmed 혼재)에서는 첫 행이 draft라 "처리중"으로 정상 출력됐다.

### D3 — INFO (미수정): 기간 필터의 "정산 내역 없음" 분기는 정상 조작으로는 도달 불가
- 위치: `components/hub/SettlementTable.tsx:247-250`
- 드롭다운 옵션이 데이터가 있는 월로만 구성되므로(207행) 빈 월을 선택할 방법이 없다. 분기 자체는 존재하고 코드도 맞다(도달 시 "YYYY년 M월 정산 내역 없음" 표시). 죽은 방어 코드 수준.

### D4 — INFO (미수정): 30줄 초과 함수 다수
- `app/api/paybacks/statement/route.tsx` GET(13–91행, 약 79줄), `app/api/ad-accounts/[id]/monthly-spend/route.ts` POST(64–112행), `app/api/ad-accounts/[id]/route.ts` PATCH(92–131행), `app/api/admin/users/[id]/route.ts` GET(56–93행), `app/api/business-verification/route.ts` POST(88–128행), `components/hub/SettlementTable.tsx` MonthTable(136–203행, JSX). 전역 CLAUDE.md의 30줄 규칙 위반이나 기존 코드베이스 스타일과 동일하고 "리팩토링 금지" 지침에 따라 수정하지 않음.

### D5 — INFO (미수정): 신규 마크업의 하드코딩 hex 색상
- `components/hub/SettlementTable.tsx`, `app/admin/settlement/page.tsx` 등 신규 파일에 `text-[#6e6e73]`, `bg-[#f5f5f7]` 류 하드코딩이 다수. 전역 규칙(색상 하드코딩 금지) 위반이지만 기존 페이지 전체가 같은 방식이라 일관성은 유지됨. 어드민 신규 컴포넌트 일부는 토큰(`text-muted`, `border-hairline`, `rounded-pill` — tailwind.config.ts에 전부 정의됨)을 사용.

---

## Item 1 — 사업자별 수수료율 + 월별 실 소진액: PASS

`payback_rate` (admin PATCH `/api/ad-accounts/[id]`, `app/api/ad-accounts/[id]/route.ts:54-61` validator, 64-71 화이트리스트):

```
PATCH {"payback_rate":7.25}  → 200, payback_rate=7.25 (DB persist 확인)
PATCH {"payback_rate":150}   → 400 "수수료율은 0에서 100 사이의 숫자여야 합니다"
PATCH {"payback_rate":"abc"} → 400 (동일 메시지)
PATCH {"payback_rate":-1}    → 400 (동일 메시지)
복원 PATCH {"payback_rate":5} → 200
```

`ad_account_monthly_spend` (`app/api/ad-accounts/[id]/monthly-spend/route.ts`):

```
POST {"period":"2099-01","spend_vat_excluded":1000000} → 200 id=ac801caf…
재POST 같은 기간 1200000 → 200 같은 id (upsert 확인: id 동일, spend 1200000으로 갱신)
POST {"period":"2099-02","spend_vat_excluded":500000} → 200 새 id (이력 누적)
GET → entries 2건, period desc 정렬
POST {"period":"2099-13",…} → 400 "period는 YYYY-MM 형식이어야 합니다"
POST spend −5 → 400 "광고비는 0 이상의 정수여야 합니다"
```

- 스키마 실측: `spend_vat_excluded bigint NOT NULL`, `unique(ad_account_id, period)`, `entered_by uuid NULL`(sentinel 대비), RLS enabled·정책 0개.
- 어드민 UI 실브라우저 확인(`/admin/users/[id]`): 수수료율 인라인 편집 버튼("2.5%", "5%") 노출, "입력/이력" 확장 패널에 입력 폼 + 이력. VAT 문구 실측:
  - 라벨: `실 소진액 (VAT 제외, 원)` (`app/admin/users/[id]/page.tsx:548`)
  - 헬퍼: `VAT 제외 금액입니다. 동일한 기간을 다시 저장하면 기존 값을 덮어씁니다.` (568행) → "VAT 제외" 명확함.

## Item 2 — 정산 리뷰 워크플로우: PASS (D1 수정 후)

- DB CHECK 실측: `paybacks_status_check = CHECK ((status = ANY (ARRAY['draft','review_1','review_2','confirmed','paid'])))`, `paybacks_cost_basis_check`에 `manual` 포함. `select status, count(*)` → draft 3, paid 1 — `pending` 행 0건.
- **sentinel(admin-entry 쿠키 전용) 실측** — `ADMIN_SESSION_SECRET`으로 직접 서명한 admin_entry_session 쿠키만으로 PATCH:
  ```
  status review_1 → 200 {"reviewed_by_1":null,"reviewed_at_1":"2026-08-26T02:29:04.29+00:00"}
  amount 55000    → 200 {"amount":55000,"cost_basis":"manual"}
  status review_2 → 200 {"reviewed_by_2":null,"reviewed_at_2":"…04.454+00:00"}
  status confirmed→ 200 {"confirmed_by":null,"confirmed_at":"…04.521+00:00"}
  status "pending"→ 400 "잘못된 status 값입니다"
  amount -100     → 400 "금액은 0 이상의 정수여야 합니다"
  ```
  FK 위반 500 없음. `*_at` 스탬프 + `*_by` NULL — `actorUserId()`(`lib/auth-server.ts:99-101`, UUID 정규식 검사)가 sentinel을 정확히 걸러낸다.
- **미들웨어 차단 여부**: 수정 전에는 실제로 차단됐다(D1). 즉 4개 구현 에이전트가 넣은 sentinel-안전 처리는 미들웨어 401에 가려 실사용 경로에서 한 번도 실행될 수 없는 상태였다. D1 수정 후 위 실측이 그 경로 그대로 통과한 것이다.
- 어드민 정산 페이지 실브라우저 확인: 상태 드롭다운 옵션 실측 `["draft=초안","review_1=1차검토","review_2=2차검토","confirmed=확정","paid=지급완료"]`(5단계 전부), 기준 배지(제출값 + "1,000,000원 기준 · 2.5%"), 금액 클릭 편집, "이력 보기" 감사 트레일 노출.

## Item 3 — 세금계산서 메일 + 사업장 정보: PASS

- 3컬럼 존재 실측(information_schema): `tax_invoice_email/business_address/naver_place_url` 전부 nullable.
- **status 불변 조건** — 최신 verification(approved, id 8d9c5c7e…) 대상, PATCH 전/후 DB 직접 조회:
  ```
  BEFORE: status=approved, 3필드 NULL
  사용자 PATCH(email+주소+naver.me URL) → 200
  AFTER : status=approved (유지), 3필드 채워짐
  '' 클리어 PATCH → 200 → DB 3필드 NULL, status=approved 유지
  어드민 PATCH(/api/admin/users/[id], email+m.place.naver.com URL) → 200 → status=approved 유지
  ```
- 검증 거부 실측:
  ```
  "not-an-email"            → 400 "세금계산서 이메일 형식이 올바르지 않습니다"
  https://evil.com/place    → 400 "네이버 플레이스 URL만 등록할 수 있습니다"
  https://evilnaver.com/x   → 400 (suffix 검사 `.naver.com`/`naver.me` — lookalike 차단 확인)
  {"status":"pending","reviewer_note":"hacked","user_id":"1111…"} → 400 "변경할 값이 없습니다" (화이트리스트가 전부 무시)
  ```
- 듀얼 모드 가드: decision + 부가정보 혼합 → 400 "decision과 부가 정보 필드는 함께 요청할 수 없습니다" (`app/api/admin/users/[id]/route.ts:185-192` 실측).
- 어드민 GET payback summary 실측: `{'draft': …, 'review_1': 0, 'review_2': 0, 'confirmed': …, 'paid': …, 'total': …}` — `pending` 키 없음, 5단계 버킷.
- 설정 페이지: `app/(app)/settings/page.tsx:380-384` — `not_submitted`면 편집 폼 대신 `BusinessInfoUnavailableNote`("사업자 정보를 먼저 등록해야…") 렌더 → 404 유발 없음. 코드 확인(라이브는 approved 유저라 편집 폼 노출 경로만 실측).

## Item 4 — 정산 내역 테이블 + 기간 조회: PASS

Chrome 실브라우저(/hub, QA 세션 = demo 사장님):
- "정산 내역" 탭이 월 그룹 `<table>` 렌더: 2026년 8월(당근 25,000P + 네이버 19,000P, 소계 +44,000P), 2026년 6월(+8,400P). 계정별 라인아이템 + 광고비(제출값 라벨) + 페이백율 + 소계 확인(스크린샷 실측).
- 기간 필터 실측: 옵션 `["all","2026-08","2026-06","2026-05"]`, `2026-06` 선택 → 해당 월 1개 테이블만 표시. `2026-05` 선택 → 배지 "지급완료" 2건(월 헤더 + 라인).
- PDF 다운로드: 2026-05에서 버튼 클릭 → 에러 div 0건(blob 다운로드 성공). 서버측은 Item 5에서 PDF 내용까지 실측.
- 빈 월 "정산 내역 없음": 분기 존재(`SettlementTable.tsx:247-250`)하나 정상 조작으로 도달 불가(D3).
- `StatementCard.tsx` 삭제 + 잔여 참조: `grep -rn "StatementCard" app components lib` → 0건.
- 내부 단계 라벨: `PAYBACK_USER_STATUS_LABEL`(draft/review_1/review_2 → 전부 "처리중", `lib/hub.ts:50-56`)만 사용자 UI(`SettlementTable.tsx:108,147`)와 PDF(`lib/pdf/settlement-statement.tsx:116`)에 사용. `PAYBACK_STATUS_LABEL`(어드민 라벨)의 비-admin 파일 사용 grep → 0건. `review_1|review_2` 문자열의 사용자 파일 노출 grep → 0건.

## Item 5 — 정산확정 ↔ 어드민 ↔ 사용자 API 정합성: PASS

전 과정 throwaway 기간 2099-01/2099-02, 실 HTTP 왕복:

1. 어드민 monthly-spend 입력: naver 계정 2099-01 = 1,200,000(upsert 후 값).
2. `POST /api/paybacks/generate {"period":"2099-01"}` → `{"created":2,"skipped":0}`. 생성 행 실측:
   ```
   danggeun: amount=25000, cost_basis=submitted, spend_basis_amount=1000000  (신고값 1,000,000×2.5%)
   naver   : amount=60000, cost_basis=verified,  spend_basis_amount=1200000  (확인값 1,200,000×5% — ad_account_monthly_spend 우선 적용 확인)
   status=draft, scheduled_pay_date=2099-02-10 (settlement_day 10 반영)
   ```
3. 어드민이 naver 행 amount 60000→55000(→cost_basis=manual), status를 review_1→review_2→confirmed로 진행(감사 스탬프는 Item 2 실측 참고).
4. **직후** 사용자 세션(QA 쿠키, demo 유저)으로 `GET /api/paybacks` 재조회:
   ```
   naver 2099-01: {"amount":55000,"status":"confirmed","cost_basis":"manual","spend_basis_amount":1200000}
   danggeun     : {"amount":25000,"status":"draft","cost_basis":"submitted","spend_basis_amount":1000000}
   ```
   금액·상태·spend_basis_amount 전부 즉시 일치. 스테일 없음.
5. 같은 세션으로 `GET /api/paybacks/statement?period=2099-01` → 200 `application/pdf`, `PUZL-2099-01-00000000.pdf`. pdftotext 실측:
   ```
   당근  최최최          1,000,000원 (제출값)   2.5%   25,000P
   네이버 을지로 쌈밥 철수네 1,200,000원 (수동 조정)   5%   55,000P
   합계 80,000P / 지급 예정일 2099-02-10 / 지급 상태 처리중
   ```
   API 응답과 완전 일치(55,000+25,000=80,000). manual 라벨("수동 조정")도 PDF에 반영.
6. throwaway 삭제 + 베이스라인 복원 — 아래 섹션.

**캐싱 위험 점검**: `app/api/paybacks/route.ts:1`, `statement/route.tsx:9`, `ad-accounts/route.ts:7`, `ad-accounts/[id]/route.ts:8`, `monthly-spend/route.ts:6` 전부 `export const dynamic = 'force-dynamic'`. `revalidate` 사용 0건. 응답 헤더 실측: `cache-control`/`etag`/`last-modified` 없음 → 브라우저 휴리스틱 캐시 대상 아님. 클라이언트는 마운트 시 fetch + 변경 후 `load()` 재조회/응답 기반 로컬 상태 갱신(`app/admin/settlement/page.tsx:191-259`) — 스테일 경로 없음. `paybacks/[id]`는 PATCH 전용이라 dynamic 지정 불필요.

## 회귀 (Regressions)

- `/hub` 광고계정 관리 탭: 실브라우저 정상(계정 2건, 페이백율 그리드, 이관 버튼) + `GET /api/ad-accounts` 200.
- 사업자 인증 submit: `POST /api/business-verification` 형식 오류 시 400 "사업자 번호는 000-00-00000 형식으로 입력해주세요" (라우트 정상 동작, DB 무변경 케이스로 확인. 파일 업로드 성공 경로는 미실측 — 커버리지 갭 참고).
- 어드민 비밀번호 게이트: 무증명 `/admin/settlement` → `307 /admin/login?next=…`; `POST /api/admin/login` 오답 → 401 "비밀번호가 올바르지 않습니다".
- 카카오 로그인 게이팅: `.env.local` `NEXT_PUBLIC_KAKAO_ENABLED=false`, `/login` HTML에 카카오 버튼 없음 — "카카오 로그인 준비 중입니다" 플레이스홀더 렌더(`app/login/page.tsx:36-44`).
- 정산 생성 중복 방지: 기존 로직 유지(`generate/route.ts:39-44`), 2099-01 재생성 시 skipped 처리 로직 코드 확인.

## 보안 (Security)

- `PATCH /api/ad-accounts/[id]` mass-assignment 실측: body에 `monthly_spend`, `user_id`, `verified_spend` 섞어 전송 → 200이지만 응답/DB에서 `monthly_spend=380000`, `user_id` 원본 유지, `verified_spend=null` — 화이트리스트(`FIELD_VALIDATORS`, route.ts:64-71) 외 필드 전부 무시됨.
- monthly-spend 라우트: 쿠키 없음 → 401, 비관리자(QA 유저) → 403 `{"error":"권한이 없습니다"}` (GET/POST 동일 가드, route.ts:47-49/65-67).
- 비관리자 차단 실측: `PATCH /api/paybacks/[id]` 403, `GET /api/paybacks?scope=all` 403, `GET /api/admin/users/[id]` 403, `statement?user_id=<타인>` 403 (`statement/route.tsx:21`).
- `PATCH /api/business-verification` 타인 행 공격: body의 `user_id`/`id`는 화이트리스트가 무시하고 대상 행은 항상 `eq('user_id', sessionUser.id)`로 세션 유저의 최신 행만 선택(route.ts:176-182) → 타인 행 수정 경로 없음. `{"user_id":"1111…"}` 포함 요청 실측 → 400 "변경할 값이 없습니다".
- RLS 실측: `ad_account_monthly_spend` relrowsecurity=true·policy 0개, `business_verifications` relrowsecurity=true·policy 0개.
- 시크릿 누출: 신규/변경 파일 및 `.env.example`에서 `sbp_…`, `eyJhbGciOi…`(JWT), `sk-ant-` 패턴 grep → 0건. `.env.local`은 `.gitignore:26`(`.env*.local`)에 걸려 미추적(`git ls-files` 0건, `git check-ignore` IGNORED). `.env.local`은 검증 중 읽기만 했고 수정하지 않음.

## 코드 품질

- `any` / `console.*` / 빈 catch / 이모지: 변경 파일 18개 전체 grep → 0건 (catch들은 전부 사유 주석 또는 에러 메시지 반환).
- 제네릭 변수명: supabase 관용구 `{ data, error }` 구조분해와 `body` 정도만 사용 — 기존 코드베이스 컨벤션과 동일. 신규 로직 변수는 구체적(`monthlySpendMap`, `verifiedMap`, `upsertRow` 등).
- 30줄 초과 함수: D4 참고 (미수정, 리팩토링 범위 밖).
- 하드코딩 hex: D5 참고.
- 어드민 UI가 쓰는 토큰(`muted`, `muted-light`, `hairline`, `primary`, `ink`, `accent-text`, `rounded-pill`)은 `tailwind.config.ts`에 전부 정의돼 있어 미정의 클래스 없음.

## tsc / build

```
$ npx tsc --noEmit   → (출력 없음) EXIT:0
$ npm run build      → ✓ Compiled successfully, 전체 라우트 생성 (D1 수정 반영 후 재빌드도 성공)
```

## 적용한 수정 (총 1건)

1. `middleware.ts` — 쿠키 전용 관리자(adminProof && !user)가 보호 API를 호출할 때 미들웨어에서 401로 끊지 않고 통과시켜 라우트 레벨 인가(`getSessionUser()` + isAdmin)에 위임. 5줄 주석 + 1줄 로직. (D1)

## DB 복원 증빙

throwaway 삭제 쿼리 returning 실측:
```
delete paybacks where period like '2099-%'  → 2건 (25000, 55000)
delete ad_account_monthly_spend             → 2건 (2099-01 1200000, 2099-02 500000)
```
복원 후 실측 = 베이스라인과 완전 일치:
- paybacks 4행: (19000, 2026-05, paid, submitted, processed_at=2026-06-03…), (8400, 2026-06, draft), (25000, 2026-08, draft), (19000, 2026-08, draft) — 감사 컬럼 전부 NULL(paid 행 processed_at 제외)
- ad_account_monthly_spend: 0행
- ad_accounts.payback_rate: naver 5.00 / danggeun 2.50
- business_verifications 2행(approved, rejected), 3개 부가 컬럼 전부 NULL, status 불변

## 커버리지 갭 (솔직 고지)

1. **실제 uuid 관리자 세션의 `*_by` 스탬프**: Supabase 관리자 계정 로그인 자격이 없어, `reviewed_by_*`에 실제 uuid가 기록되는 경로는 라이브로 못 돌렸다. `actorUserId()`가 UUID 정규식 통과 시 id를 그대로 반환하는 것(auth-server.ts:99-101)과 QA 쿠키 검증에서 동일 정규식 로직이 동작함은 확인. sentinel(NULL) 경로는 라이브 실측 완료.
2. **사업자 인증 파일 업로드 성공 경로**: 실 파일 업로드는 DB/스토리지에 잔여물을 남기므로 형식 검증 400 경로까지만 라이브 실측. 업로드/매직바이트 코드는 이번 작업에서 변경되지 않았음(diff 상 PATCH 추가만).
3. **어드민 정산 페이지의 상태 변경/금액 편집 버튼 클릭**은 브라우저에서 직접 누르지 않고(실데이터 오염 방지) 동일 API를 curl로 실측했다. UI가 같은 엔드포인트·페이로드를 쓰는 것은 코드로 확인(`app/admin/settlement/page.tsx:121-124, 244-248`).
4. 동시성(두 관리자가 동시에 같은 payback을 편집)은 검증 범위 밖 — last-write-wins이며 낙관적 잠금 없음.
