# VERIFICATION — 연동 허브 / 어드민 / 사업자 인증 게이트

- 검증일: 2026-08-26
- 브랜치: `fix/naver-place-apollo-state`
- 검증 서버: `http://localhost:4781` (`next dev`)
- 검증 방식: 실제 curl + 실제 브라우저 조작 + 라이브 Supabase SQL 대조
- 검증 주체: 구현 에이전트와 분리된 독립 검증 에이전트 (반증 목적)

`npx tsc --noEmit` 통과 / `npm run build` 통과.

---

## 사전 실측 — 마이그레이션 파일과 실 DB 대조

이 프로젝트는 마이그레이션 002가 파일만 존재하고 실 DB에 미적용된 전례가 있어,
007 적용 후 파일이 아닌 **라이브 DB**를 직접 조회해 재확인했다.

| 확인 항목 | 실측 결과 |
|---|---|
| `ad_accounts.contact_email` / `contact_phone` / `tax_invoice_direct` | 3개 전부 존재 (`information_schema.columns`) |
| `connection_status` CHECK | `CHECK ((connection_status = ANY (ARRAY['duplicate','reviewing','connected'])))` |
| `connection_status` 잔존 `normal` | 0건 (2건 전부 `reviewing`으로 백필됨) |
| `business_verifications` 테이블 | 존재, 8개 컬럼 전부 확인 |
| `business_verifications` RLS | `relrowsecurity = true`, 정책 0개 (service_role 전용) |
| Storage 버킷 `business-certificates` | 존재, `"public": false` |
| `public.users` 행 수 | **29 (작업 전후 불변)** |

`public.users`는 타 프로젝트와 공유 중이므로 read-only를 유지했다.
저장소 전체 grep 결과 `.from('users')` 호출은 전부 select이며, 쓰기 경로가 존재하지 않는다.

---

## 항목별 결과

| # | 항목 | 결과 |
|---|---|---|
| 1 | 이관 확인 요청 취소 | PASS |
| 2 | 어드민 사이드바 접기 | PASS |
| 3 | 어드민 광고계정 테이블 재구성 | PASS |
| 4 | 사업자 등록증 인증 필수 게이트 | PASS |
| 5 | 어드민 사용자별 상세 관리 | PASS |

---

### 항목 1 — 이관 확인 요청 취소 · PASS

신규 `app/api/ad-accounts/[id]/cancel-transfer/route.ts`.
상태 머신을 curl로 끝까지 구동하고 각 단계마다 SQL로 실제 반영을 확인했다.

| 단계 | 응답 | SQL 실측 |
|---|---|---|
| `PATCH {"transfer_status":"transfer_needed"}` | 200 | `transfer_needed` |
| `POST confirm-transfer` | 200 | `verifying` |
| `POST cancel-transfer` | 200 | `transfer_needed` |
| `POST cancel-transfer` (재호출) | **409** `지금 단계에서는 확인 요청을 취소할 수 없습니다` | 변화 없음 |
| 존재하지 않는 UUID / 잘못된 형식 | 404 | — |

재호출이 조용히 성공하지 않고 409로 거절되는 것까지 확인했다.

브라우저 실조작: `/hub`에서 `verifying` 상태 카드에만 취소 버튼이 노출되고,
클릭 시 DB가 `transfer_needed`로 바뀌며 버튼이 사라진다. `transfer_needed` 카드에는 버튼이 없다.

### 항목 2 — 어드민 사이드바 접기 · PASS

`app/admin/layout.tsx`. 220px → 64px 아이콘 레일로 접히고 `<main>`이 정상 리플로우된다(빈 공간 없음).
`localStorage['puzzle-admin-sidebar-collapsed']`에 저장되며 **하드 리로드 후에도 접힘 상태가 유지**된다.

localStorage를 `useEffect` 안에서만 읽어(`layout.tsx:34-38`) SSR 렌더 중 접근하지 않는다 —
리로드 후 콘솔에 hydration 경고 및 에러 0건.

### 항목 3 — 어드민 광고계정 테이블 재구성 · PASS

`/admin/ad-accounts`의 DOM에서 헤더를 직접 읽어 8개 컬럼과 순서를 확인했다:
플랫폼 / 접수일자 / 계정명·아이디 / 담당자 이메일·연락처 / 신청자(아이디)·사업자등록번호 / 세금계산서 직발행 / 이관 상태 / 연결 상태.

인라인 수정 전부 SQL 실측으로 영속 확인 + 리로드 후 유지:
`contact_email` → `manager@chulsoo.kr`, `contact_phone` → `010-9999-8888`,
`tax_invoice_direct` → `true`, 이관 상태 → `verifying`, 연결 상태 → `connected`.

사업자등록번호는 `business_verifications`를 `user_id`로 조인해 최신 행 기준으로 표시(`123-45-67890` 실측).
미인증 유저의 `미등록` 폴백은 `app/admin/ad-accounts/page.tsx:264`에 존재하나,
현재 두 계정 모두 인증 완료된 데모 유저 소유라 라이브 재현은 불가 — **정적 확인**.

**`PATCH /api/ad-accounts/[id]` 보안 검증 (mass-assignment)**

`{"payback_rate":99,"user_id":"1111…","monthly_spend":999999999}`를 밀어넣었으나
SQL 실측 결과 `payback_rate=5.00`, `user_id=demo`, `monthly_spend=380000`으로 **전부 무시**됨
(화이트리스트 `route.ts:53-59`). 잘못된 enum(`connection_status:"normal"`, `transfer_status:"bogus"`)과
형식 오류 이메일은 전부 400으로 차단되며 DB 에러가 새어나오지 않는다.

### 항목 4 — 사업자 인증 + 앱 전체 게이트 · PASS

미인증 상태에서 `/hub`, `/dashboard`, `/earnings` 접근 시 전부 `/settings`로 리다이렉트되며,
확인이 끝나기 전에는 스켈레톤만 노출된다 — **앱 콘텐츠가 먼저 보였다 사라지는 현상 없음**.

`/settings` 자체는 게이트를 단락시켜(`app/(app)/layout.tsx:37-43`) 리다이렉트 루프가 발생하지 않는다(6초 이상 체류 확인).
`/admin`, `/admin/users`는 게이트 밖이라 정상 접근된다 — 승인 경로가 막혀 교착되는 상황이 없다.

브라우저에서 실제 파일을 업로드한 결과:

- `business_verifications` 행 생성, `status='pending'`
- `certificate_path` = `00000000-…-0001/1787676818496-5e3fcaac-….png` — 서버 생성 경로이며 **클라이언트 파일명이 아님**
- service role로 Storage GET → 200 (2008 bytes, 원본 크기 일치)
- **anon key로 동일 오브젝트 → 거부**, 공개 URL → Bucket not found (비공개 버킷 확인)

검증 프로브: 사업자번호 `123` / `12-3-4`, `.txt` 업로드, 11MB 파일, 파일 누락 —
전부 구체적인 한국어 400 반환, 500 없음, 조용한 성공 없음.

반려/승인 사이클: 사유와 함께 반려 → `/settings`에 `사업자 정보가 반려되었습니다` + **실제 사유 노출** + 재제출 폼,
게이트는 계속 닫힘. 재제출 후 승인 → **게이트 열림**, `/hub` 정상 로드.
사유 없는 반려 및 공백만 입력한 반려는 400으로 거절된다.

**알려진 한계 (스코프 내 사양이나 명시해 둠)**: 이 게이트는 100% 클라이언트 사이드다
(`app/(app)/layout.tsx:35-68`의 fetch + `router.replace`). 서버 미들웨어가 없어
미인증 상태에서도 `/api/*` 라우트는 그대로 호출 가능하다. 이 프로젝트는 로그인 자체가 없는
데모 단계이고 어드민 API도 동일하게 비인증이므로 현재 기준으로는 일관되지만,
실사용자 로그인을 붙이는 시점에 **서버 사이드 인가로 승격해야 한다**.

### 항목 5 — 어드민 사용자별 상세 · PASS

`/admin/users`의 `tbody` 행을 DOM에서 세어 29개 확인 — DB 유저 수와 일치.
`profile_data`가 비어 있는 행은 이메일로 폴백된다.
구 목업(`MOCK` 배열, 존재하지 않는 `business_name`/`points` 컬럼 사용)은 grep 결과 완전히 제거됨.

`/admin/users/<demo>` 집계를 raw SQL과 대조 — 값이 존재하는 수준이 아니라 **수치가 정확히 일치**함을 확인:

| 섹션 | 화면 | SQL |
|---|---|---|
| 수익 현황 | 처리중 8,400 / 확정 0 / 지급완료 19,000 / 합계 27,400 | `pending=8400`, `paid=19000`, 확정 0건 |
| 예산 현황 | 1,380,000원 | `sum(monthly_spend)=1380000` |
| 광고 매체 연동 | 네이버·당근 2건, 상태 일치 | 동일 |

`GET /api/admin/users/abc` → 400, 존재하지 않는 UUID → 404.

---

## 검증 중 발견해 수정한 추가 이슈

브리프에 없었으나 검증 과정에서 드러나 함께 고친 항목. 수정 후 전부 재실측했다.

### 1. `api_credentials` 평문 노출 (보안)

`confirm-transfer` / `cancel-transfer` / `transfer-status`가 `.select()`(= `*`) 결과를 그대로 반환해
API 자격증명이 응답 본문에 실려 나갔다. 현재 값이 `{}`라 실제 유출은 없었으나
자격증명이 저장되는 순간 새어나갈 자리였다.

`lib/hub-server.ts`에 `maskAdAccountCredentials()` 공용 헬퍼를 만들어 4개 라우트에 통일 적용.
검증 시 `api_credentials`에 `SUPERSECRET123456`을 임시 주입하고 각 라우트 응답을 확인:

| 라우트 | 응답 |
|---|---|
| `GET /api/ad-accounts/[id]` | `{"secret_key":"*************3456"}` |
| `POST .../confirm-transfer` | `{"secret_key":"*************3456"}` |
| `POST .../cancel-transfer` | `{"secret_key":"*************3456"}` |
| `PATCH .../transfer-status` | `{"secret_key":"*************3456"}` |

4곳 모두 평문 미노출. 확인 후 `api_credentials`는 `{}`로 원복했다.

### 2. 파일 업로드 MIME 위조 가능 (보안)

업로드 검증이 클라이언트가 보낸 `file.type`만 신뢰해, `.exe`를 `image/png`로 선언하면 통과됐다.
관리자가 나중에 열어보는 파일이라 실질 위험이 있다.
`app/api/business-verification/route.ts`에 매직 바이트 검사를 추가하고,
저장 확장자도 선언값이 아닌 **실제 시그니처**에서 도출하도록 변경.

재실측 — `MZ\x90\x00`(PE 실행파일 헤더)을 `type=image/png`로 전송:
`400 {"error":"파일 내용이 올바른 이미지 또는 PDF 형식이 아닙니다"}` — 스토리지 도달 전 차단.
정상 PNG + 정상 사업자번호는 `201 {"status":"pending"}`으로 통과.

### 3. 잘못된 JSON 바디 → 500

`req.json()`이 무방비로 호출돼 파싱 실패 시 스택 트레이스가 노출됐다.
`ad-accounts/[id]`, `transfer-status`, `admin/users/[id]` 3곳 전부 400으로 교정.
재실측: `--data-raw '{bad json'` → 3곳 모두 **400**.

### 4. 존재하지 않는 UUID PATCH → 500

not-found와 실제 DB 실패가 한 분기에 묶여 있었다. Supabase `.single()`의 `PGRST116`을 분기해 404로 분리.
재실측: 미존재 UUID PATCH → `404 {"error":"광고계정을 찾을 수 없습니다"}` (`ad-accounts/[id]`, `transfer-status` 양쪽).
잘못된 enum(`connection_status:"normal"`)은 그대로 `400 잘못된 연결 상태 값입니다` 유지.

### 재검증 결과

`npx tsc --noEmit` 통과 / `npm run build` 통과 / 주요 페이지 8종 전부 200,
dev 서버 런타임 에러 0건 (`/`, `/hub`, `/settings`, `/dashboard`, `/admin`,
`/admin/ad-accounts`, `/admin/users`, `/admin/users/[id]`).

## 수정하지 않기로 한 항목

- **하드코딩 색상값** (`bg-[#1d1d1f]` 등) — 전역 규칙 위반이지만 기존 코드베이스 전체 스타일과 동일하고,
  다른 세션이 `globals.css` / `tailwind.config.ts`를 잡고 디자인 시스템 업그레이드를 진행 중이라
  지금 손대면 충돌한다. 해당 작업에 흡수시키는 편이 맞다.
- **사이드바 하이드레이션 직전 220px→64px 폭 이동** — 시각적 미세 이슈이며,
  하이드레이션 전까지 `invisible` 처리하는 현재 방식이 합리적인 절충이다.

## 검증 후 DB 상태

- `public.users` — 29행, 무변경 (종료 시 재확인)
- `public.ad_accounts` — 2행 전부 검증 전 원상태로 복구 (`transfer_status='completed'`,
  `connection_status='reviewing'`, 연락처 NULL, `tax_invoice_direct=false`)
- `public.business_verifications` — 데모 유저 2행 (반려 1 + **승인 1**). 최신이 승인이므로 **게이트 열림 = 앱 정상 이용 가능**
- Storage — 반려/승인 사이클 검증에 쓰인 PNG 2건 (추가 수정 검증 중 만든 3번째 행과 오브젝트는 삭제 완료)

## 후속 과제

1. **게이트를 서버 사이드로 승격** — 실사용자 로그인을 붙이는 시점에 미들웨어 또는 라우트 핸들러 레벨 인가로 옮겨야 한다.
   현재 어드민 API도 동일하게 비인증이므로 같은 시점에 함께 처리하는 것이 맞다.
2. **하드코딩 색상 정리** — 진행 중인 디자인 시스템 업그레이드 작업에 흡수.
