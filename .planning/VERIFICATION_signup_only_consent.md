# 동의 절차를 최초 가입 1회로 한정 — 구현/검증 기록

작성일: 2026-08-27 / 브랜치: `main`
설계 문서: `.planning/PLAN_signup_only_consent.md`
직전 사이클: `.planning/VERIFICATION_kakao_consent_flow.md`

## 착수 전 상태

`/login`이 매 로그인 시도마다 동의 체크박스를 띄우고 필수 미체크 시 카카오 버튼을 막았다.
신규 가입이든 기존 유저 재로그인이든 구분이 없었다. 동의값은 `puzl_consent` httpOnly 쿠키로
OAuth 왕복을 건너 콜백까지 전달됐고, `backfillExistingUser`가 **재로그인 때마다 consent를 덮어썼다**.

## 구현

### 동의 수집 지점 이동

동의 판별 기준을 "가입 시점"이 아니라 **`profile_data.consent` 기록의 유무**로 잡았다.
이 선택 덕분에 신규 가입자뿐 아니라 과거 쿠키 유실로 consent 없이 만들어진 기존 유저도 같은 경로로 구제된다.

- `app/auth/callback/route.ts` — 쿠키 판독·삭제(`clearConsentCookie`) 전부 제거.
  `syncUserRow` 후 `parseStoredConsent(profile?.consent)`가 null이면 `/auth/consent?next=...`로,
  아니면 기존대로 온보딩 여부에 따라 `/onboarding` 또는 `next ?? /hub`.
- `app/auth/consent/page.tsx` (신규) — 서버 컴포넌트. 세션 없으면 `/login`, 이미 동의했으면 목적지로 리다이렉트.
- `components/auth/ConsentInterstitial.tsx` (신규) — `ConsentCheckboxes`를 그대로 재사용하는 클라이언트 경계.
- `app/api/auth/consent/route.ts` — 비인증 쿠키 발급 엔드포인트에서 **인증 필수** 라우트로 전환.
  POST(최초 저장) / PATCH(마케팅만 변경) / GET(현재값 조회) 모두 `getSessionUser()` 통과 필수.

`insertNewUser`는 consent를 더 이상 받지 않는다. `auth.users`는 카카오 인증 순간 Supabase가 이미 만들기 때문에
"동의 전에는 계정을 만들지 않는다"는 선택지가 애초에 성립하지 않는다 — 프로필을 먼저 만들고 동의를 뒤에 받는다.

`backfillExistingUser`의 consent 덮어쓰기는 제거했다. 이제 재로그인은 `kakao_id`/`avatar_url`/`name`
백필만 하고 consent에는 손대지 않는다(최초 1회 기록 후 불변).

### 병합 저장

`persistConsent`는 항상 `{ ...profile, consent }` 형태로만 쓴다. `profile_data`는 `referral_code`,
`onboarded_at`, `total_points` 등 다른 단계·제품이 쓰는 키를 함께 담는 jsonb라 통째로 교체하면 유실된다.
실측으로 보존을 확인했다(아래 검증 3).

### 로그인 화면

`LoginConsentGate`는 사용처가 사라져 삭제했다. `/login`은 `KakaoLoginButton` + `LegalNotice`(체크박스 없는
안내 문구 + `/legal/*` 링크)만 남았다. `NEXT_PUBLIC_KAKAO_ENABLED` 분기와 "준비 중" 안내는 그대로다.

`KakaoLoginButton`에서 `consent` prop, `hasRequiredConsent` 가드, `recordConsent` 사전 호출을 제거했다.
Supabase 프로바이더 미설정 시 400 JSON 페이지로 튕기는 걸 막는 `canReachAuthorize` 프리플라이트는 유지했다 —
동의와 무관한 기존 안전장치다.

### 카카오 심사 화면 (존치)

`/kakao-login`, `/kakao-signup`은 카카오 콘솔에 URL로 제출된 심사 전용 경로라 존치했다.
다만 `/login`에서 체크박스가 사라진 이상 심사 화면만 체크박스를 유지하면 "제출한 화면 ≠ 실제 화면"이 되므로
`/login`과 동일한 구성으로 정렬했다. 동의 가드가 사라져 버튼이 항상 활성이므로 `forceButtonEnabled` prop은 소멸했다.
플래그를 의도적으로 읽지 않는 성질은 유지했다.

### middleware.ts — 변경 없음

이 저장소 최고 리스크 파일이라 한 줄도 건드리지 않았다. `/auth/consent`는 무변경으로 요구 동작을 만족한다:
`PROTECTED_PAGES`에 `/auth`가 없어 `isProtectedPage === false`이고, 온보딩·사업자인증 게이트 모두
`!isProtectedPage`에서 즉시 `null`을 반환한다(양쪽 exempt 목록에 `/auth/`도 이미 있어 이중 안전).
인증 요구는 페이지의 `getSessionUser()`, 저장 인가는 API의 `getSessionUser()`가 각각 담당한다.

### 부수 정정

`app/legal/privacy/content.ts` 9조에 `puzl_consent` 쿠키가 5분간 발급된다고 적혀 있었다. 그 쿠키가
사라졌으므로 "동의 내역은 쿠키가 아니라 회원 계정 정보에 저장됩니다"로 정정했다(사실과 다른 고지 방지).

## 검증

`npx tsc --noEmit` 통과(출력 없음). `npm run build` 통과 — `/auth/consent`가 동적 라우트로 정상 생성됐다.

dev 서버 실측. 카카오 OAuth 왕복은 자동화할 수 없으므로 QA 모드 쿠키 2장(`admin_entry_session`,
`qa_mode_session`)을 `ADMIN_SESSION_SECRET`으로 서명해 `QA_USER_ID` 데모 계정(`demo@puzzle.kr`)
세션으로 접근했다. 이 계정은 `profile_data`에 7개 키가 채워져 있어 병합 보존 검증 표본으로 적합했다.

| # | 항목 | 결과 |
|---|---|---|
| 1 | `/login` 체크박스 부재 | 체크박스 0개, "카카오로 시작하기" 버튼 + 약관/처리방침 링크 노출 |
| 2 | 비인증 차단 | `/auth/consent` → 307 `/login`. `/api/auth/consent` GET·POST·PATCH 모두 401 |
| 3 | **병합 보존** | 동의 저장 후 `name`·`phone`·`onboarded_at`·`total_points`·`business_name`·`referral_code`·`notification_email` **7개 키 전부 보존**, `consent`만 추가 |
| 4 | 동의 인터스티셜 | 세션 O + consent 없음 → 200. "가입을 완료해주세요" 카피, 체크박스 4개, "동의하고 시작하기" 버튼, `alert()` 0건 |
| 5 | 제출 검증 | 필수 미체크 400, 형식 오류 400, 정상 제출 `{ok:true,onboarded:true}` |
| 6 | **재방문 무마찰** | 동의 완료 후 `/auth/consent` 재방문 → 307. `next=/dashboard`면 `/dashboard`, 없으면 `/hub` |
| 7 | 오픈 리다이렉트 | `next=//evil.com` → `/hub`로 폴백(`sanitizeRedirectPath` 정상 동작) |
| 8 | 마케팅 변경 | PATCH `{marketing:true}` → 200, `agreed_at` 갱신 확인(`08:08:08` → `08:08:24`). 형식 오류 400 |
| 9 | consent 없는 상태 PATCH | 409 + "동의 기록이 없어…" — 필수 동의를 임의로 만들어내지 않음 |
| 10 | **레거시/변형 데이터** | `consent`가 `privacy:false`인 경우, 문자열 `"yes"`인 경우, 아예 없는 경우 3종 모두 "동의 안 함"으로 처리되어 동의 폼 렌더(크래시 없음) |
| 11 | `/settings` 토글 | "알림 수신 설정" 섹션 렌더, 설명 문구 노출 |
| 12 | 심사 화면 | `/kakao-login` 200, 체크박스 0개, 버튼 활성 — `/login`과 동일 구성 |
| 13 | 기존 에러 경로 | `/auth/callback` (code 없음) → 기존과 동일하게 `/login?error=...` |

검증 후 데모 계정 `profile_data`는 착수 전 스냅샷과 **바이트 동일하게 복구**했다(임시 스크립트도 삭제).

### 검증하지 못한 것

실제 카카오 OAuth 왕복(코드 교환 → `syncUserRow` → 분기)은 자동화 불가라 직접 실행하지 못했다.
다만 콜백의 분기 판단은 `/auth/consent` 페이지와 **동일한 `parseStoredConsent` 함수**를 쓰고, 그 함수는
검증 6(있음 → 통과)과 검증 10(없음·변형 → 동의 요구) 양방향으로 실측됐다. 프로덕션 첫 배포 후
신규 계정 1건으로 육안 확인을 권한다.

## 남은 리스크 / 갭

- **`lib/email.ts`가 `consent.marketing`을 확인하지 않는다.** 현재 발송되는 건 환영 메일 등 거래성
  메일이라 당장 법적 문제는 아니지만, 마케팅성 발송을 붙이는 순간 수신거부 유저 필터가 반드시 필요하다.
  이번 사이클은 값의 정확한 저장·수정만 담당하고 발송 게이트는 연결하지 않았다(설계 시 합의된 범위 밖).
- 기존 유저 중 consent가 없는 계정은 다음 로그인 때 동의 화면을 한 번 본다. 의도된 동작이지만,
  실사용자에게는 "없던 화면이 갑자기 뜨는" 경험이라 배포 후 문의가 들어올 수 있다.
- `/settings`의 필수 동의 항목(이용약관·개인정보처리방침)은 조회·변경 UI가 없다. 철회는 탈퇴로만 가능하다.
