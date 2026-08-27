# PLAN: 동의 절차를 최초 가입 1회로 한정 (로그인 화면에서 분리)

작성일: 2026-08-27
선행 문서: `.planning/PLAN_kakao_consent_flow.md`, `.planning/VERIFICATION_kakao_consent_flow.md`

## 배경

`PLAN_kakao_consent_flow.md` 사이클에서 동의 수집을 구현할 당시에는 카카오 로그인이 아직 실동작 전이었고,
"로그인 화면에서 동의를 받아 httpOnly 쿠키(`puzl_consent`)로 OAuth 왕복 구간을 건너 콜백까지 전달"하는
방식을 택했다. 그 결과 지금은 **매 로그인마다** 동의 체크박스가 뜨고, 필수 미체크 시 카카오 버튼이 막힌다.

카카오 로그인은 그 사이 프로덕션 실계정으로 성공 확인됐고(`NEXT_PUBLIC_KAKAO_ENABLED=true`),
프로덕트 오너 지적이 들어왔다: **동의는 최초 가입 때 1회면 된다. 기존 유저 재로그인은 그냥 통과해야 한다.**

핵심 제약: 로그인 **시점**에는 카카오 인증 전이라 신규/기존 판별이 불가능하다.
반면 콜백(`app/auth/callback/route.ts`)의 `syncUserRow`는 `public.users`를 id로 조회해 이미 정확히
신규(`insertNewUser`)/기존(`backfillExistingUser`)을 구분하고 있다. 이 판별을 재사용한다.

## 결정: 동의를 "로그인 전 게이트"에서 "로그인 후 인터스티셜"로 이동

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 동의 수집 시점 | 카카오 인증 **전** (`/login`) | 카카오 인증 **후** (`/auth/consent`) |
| 노출 대상 | 모든 로그인 시도 | `profile_data.consent`가 없는 유저만 |
| OAuth 왕복 전달 수단 | `puzl_consent` httpOnly 쿠키 | 불필요 (세션이 이미 있음) |
| 저장 주체 | 콜백이 쿠키를 읽어 저장 | `/api/auth/consent`가 세션 유저에 직접 저장 |
| 재로그인 시 | 매번 동의 화면 | 통과 |

`auth.users` 행은 카카오 인증 순간 Supabase가 이미 만든다. 즉 "동의 전에는 계정을 만들지 않는다"는
선택지는 애초에 성립하지 않는다. 따라서 프로필은 만들되(consent 없이) 로그인 완료 직후 인터스티셜에서
동의를 받는 형태가 실제 인증 흐름과 어긋나지 않는 유일한 구조다.

### 기각한 대안

- **로그인 화면에 체크박스 유지 + 기존 유저만 자동 통과**: 로그인 시점 신규/기존 판별 불가로 구현 불가능.
- **온보딩 화면에 동의 병합**: 온보딩은 이름·연락처 수집 단계이고 이미 완료한 유저는 다시 오지 않는다.
  consent 없이 온보딩만 끝낸 기존 유저를 영원히 놓친다.
- **쿠키 유지 + 신규만 저장**: 쿠키 왕복 자체가 불필요해진 상태에서 공유 브라우저 승계 리스크만 남는다.

## 저장 구조 (변경 없음)

`public.users.profile_data.consent = { terms, privacy, marketing, agreed_at }`
`public.users`는 타 puzl 제품과 공유 테이블 — **SQL 컬럼 추가 금지**, jsonb 안에서만 다룬다.
`profile_data` 갱신은 항상 **기존 키 병합**으로만 한다(`referral_code` 등 유실 금지).

## 요구사항

| ID | 요구사항 | 수용 기준 |
|---|---|---|
| FR-01 | `/login`에서 동의 UI 제거 | 체크박스 없음. 카카오 버튼 즉시 활성. 하단에 약관·처리방침 링크 안내 문구만 |
| FR-02 | 재로그인 무마찰 | `consent` 보유 유저는 콜백에서 곧바로 `/onboarding` 또는 `next ?? /hub` |
| FR-03 | 신규 가입 동의 인터스티셜 | `consent` 없는 세션은 콜백이 `/auth/consent?next=...`로 보냄 |
| FR-04 | 인터스티셜 카피 분리 | "로그인"이 아니라 "가입 완료 단계"임이 드러나는 문구 |
| FR-05 | 필수 미체크 시 제출 차단 | 버튼 비활성 + 인라인 안내(`alert()` 금지) |
| FR-06 | consent API 인증 필수 | 세션 없으면 401. 비인증 쿠키 발급 경로 제거 |
| FR-07 | 동의 1회 불변 | `backfillExistingUser`의 재로그인 consent 덮어쓰기 제거. marketing만 설정에서 변경 |
| FR-08 | 마케팅 수신 토글 | `/settings`에서 현재값 표시·변경, 변경 시 `agreed_at` 갱신 |
| FR-09 | 쿠키 흔적 제거 | `CONSENT_COOKIE` 관련 상수/파서 삭제, 개인정보처리방침 쿠키 조항 정정 |
| FR-10 | 기존 로그인 흐름 무회귀 | OAuth 시작, 콜백 신규/기존 판별, 온보딩 게이트, 미들웨어 5단 게이트 불변 |

## 파일별 변경

| 파일 | 변경 |
|---|---|
| `app/login/page.tsx` | `LoginConsentGate` → `KakaoLoginButton` + `LegalNotice`. 플래그 분기는 그대로 |
| `components/auth/KakaoLoginButton.tsx` | `consent` prop·`hasRequiredConsent` 가드·`recordConsent` 제거. 프리플라이트는 유지 |
| `components/auth/LegalNotice.tsx` | 신규. 체크박스 없는 안내 문구 + `/legal/*` 링크 |
| `components/auth/ConsentInterstitial.tsx` | 신규. 세션 보유 상태에서 동의 제출하는 클라이언트 경계 |
| `app/auth/consent/page.tsx` | 신규. 서버에서 세션·consent 확인 후 인터스티셜 렌더 또는 목적지로 리다이렉트 |
| `app/api/auth/consent/route.ts` | 인증 필수. POST=최초 저장, PATCH=마케팅 변경, GET=현재값 조회 |
| `app/auth/callback/route.ts` | 쿠키 판독/삭제 제거. consent 없으면 `/auth/consent`로 |
| `lib/consent.ts` | 쿠키 상수 삭제, `parseConsentCookie` → `parseStoredConsent`로 재활용 |
| `components/auth/LoginConsentGate.tsx` | 삭제 (사용처 없음) |
| `components/auth/KakaoReviewScreen.tsx` | `/login`과 동일한 구성으로 정렬(체크박스 제거), 플래그 미판독은 유지 |
| `app/(app)/settings/page.tsx` | 마케팅 수신 토글 섹션 추가 |
| `app/legal/privacy/content.ts` | `puzl_consent` 쿠키 조항 정정 |
| `middleware.ts` | **변경 없음** (아래 근거) |

### middleware.ts를 건드리지 않는 근거

이 저장소 최고 리스크 파일이다. `/auth/consent`는 이미 무변경으로 요구 동작을 만족한다:

- `PROTECTED_PAGES`에 `/auth`가 없다 → `isProtectedPage === false` → `handleOnboardingGate`가 즉시 `null` 반환
- `handleOnboardingGate`의 exempt 목록에도 `pathname.startsWith('/auth/')`가 이미 있다 (이중 안전)
- `handleVerificationGate`도 `!isProtectedPage`에서 즉시 `null`, exempt에도 `/auth/` 포함

인증 요구는 페이지 서버 컴포넌트의 `getSessionUser()`가, 저장 인가는 API의 `getSessionUser()`가 담당한다.
동의 미완 유저의 `/onboarding` 진입 차단은 **이번 범위 밖**이다 — 미들웨어에 게이트를 하나 더 얹는
회귀 비용이 이득보다 크다고 판단했다.

> **정정(구현 후):** 최초 작성 시 여기에 "콜백이 유일한 진입 경로이므로 우회 불가"라고 적었으나
> 이는 **사실이 아니다.** `/auth/consent`에 도착한 유저는 이미 완전한 세션을 보유하므로 주소창에
> `/hub`를 직접 입력하면 동의 없이 진입한다. 범위 제외 결정 자체는 유지하되(회귀 비용 근거),
> 이 문장을 다음 사이클의 근거로 재사용하지 마라. 상세는 `VERIFICATION_signup_only_consent.md` 리스크 항목.

### 카카오 심사 화면 존치 판단

`/kakao-login`, `/kakao-signup`은 카카오 개발자 콘솔에 URL로 제출된 심사 전용 경로다.
플래그와 무관하게 항상 활성 버튼을 보여주는 목적은 유효하므로 **존치**한다.
다만 `/login`에서 체크박스가 사라졌으므로 심사 화면만 체크박스를 유지하면 "제출한 화면 ≠ 실제 화면"이 된다.
`LoginConsentGate` 대신 `/login`과 같은 구성으로 정렬한다. `forceButtonEnabled` prop은 소멸한다
(동의 가드가 없어져 버튼이 항상 활성이므로 강제 플래그 자체가 불필요).

## 범위 밖 (알려진 갭)

- **`lib/email.ts`가 `consent.marketing`을 확인하지 않는다.** 마케팅성 발송이 실제로 붙는 시점에
  수신거부 유저를 걸러내는 로직이 필요하다. 이번 사이클에서는 값을 정확히 저장·수정 가능하게만 만들고
  발송 게이트는 연결하지 않는다.
- 위치기반서비스 약관, 청소년 보호정책 등 나머지 법적고지 문서.
- `NEXT_PUBLIC_KAKAO_ENABLED` 플래그 값 변경(사용자가 외부에서 관리).

## 완료 기준

- `npx tsc --noEmit`, `npm run build` 통과
- dev 실측: `/login` 체크박스 없음 / consent 없는 세션 → `/auth/consent` / 제출 시 `profile_data` 병합 저장
  (`referral_code` 등 보존) 후 온보딩 이동 / `/settings` 마케팅 토글 반영
- 산출물: 본 문서 + `.planning/VERIFICATION_signup_only_consent.md`
