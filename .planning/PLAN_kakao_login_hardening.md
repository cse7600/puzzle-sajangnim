# PLAN — 카카오 로그인 하드닝 (kakao_login_hardening)

- 작성일: 2026-08-27
- 상태: 계획 확정
- 선행 문서: `.planning/PLAN_kakao_consent_flow.md`, `.planning/VERIFICATION_kakao_auth.md`
- 참고 저장소: `레페리오/referio-platform` (referio.puzl.co.kr 라이브, 카카오 로그인 검증 완료) — **읽기 전용 참고, 수정 금지**

---

## 1. 배경

### 1-1. 사용자 지적 (버그)

로그인 화면(`/login`)에 노란색 활성 버튼 "카카오로 시작하기"와 회색 "카카오 로그인 준비 중입니다" 플레이스홀더가 **동시에** 렌더링된다. 실제 환경은 `NEXT_PUBLIC_KAKAO_ENABLED=false`라 카카오 로그인이 동작하지 않는데, 화면상으로는 동작하는 것처럼 보인다.

### 1-2. 원인 (조사 완료)

렌더 트리: `app/login/page.tsx`(서버) → `LoginConsentGate`(클라이언트) → `ConsentCheckboxes` + `KakaoLoginButton`

| # | 파일 | 문제 |
|---|------|------|
| 1 | `app/login/page.tsx:36-43` | `LoginConsentGate`를 무조건 렌더링하고, `!KAKAO_ENABLED`일 때 준비중 박스를 **추가로** 렌더링 |
| 2 | `components/auth/LoginConsentGate.tsx:21-26` | `kakaoEnabled=false`를 받아도 `KakaoLoginButton`을 항상 렌더링하고 `disabled`만 전달 |
| 3 | `components/auth/KakaoLoginButton.tsx:89` | disabled여도 `bg-[#FEE500]` 노란 배경 유지, `disabled:opacity-60`만 적용 → 활성 버튼과 시각적 구분 불가 |

"준비 중" 상태 표현 책임이 세 파일에 흩어져 있는 것이 근본 원인이다.

### 1-3. referio-platform 참고 결론

동일 스택(Next.js + `@supabase/ssr` + Supabase Auth `signInWithOAuth({provider:'kakao'})`)이며 카카오 앱 키는 Supabase 대시보드에만 등록된다. 퍼즐과 기반이 같으므로 **패턴만** 이식한다.

이식 대상:
- 콜백 이름 추출 폴백 체인 `full_name → name → nickname → preferred_username`
- 카카오가 닉네임 미동의 시 문자열 `"NaN"`을 반환하는 실측 버그의 정규화
- `exchangeCodeForSession` 실패 시 banned 계정 구분 분기
- 카카오 심사 제출 전용 라우트(플래그 무시, 버튼 항상 활성)

**이식 제외(명시적 범위 밖)**: 추천 쿠키, 자동 프로그램 가입, 카카오 채널 동기화, `partners` 전용 테이블 3단계 조회 로직.

**퍼즐 고유 유지 항목**: authorize 프리플라이트 검증(`canReachAuthorize`), `kakao_<id>@no-email.puzl.local` 더미 이메일 + 온보딩 실제 이메일 강제 입력, scope `'profile_nickname account_email'`(referio와 동일이므로 변경 없음).

---

## 2. 목표

| ID | 목표 |
|----|------|
| G1 | 카카오 비활성 상태에서 활성처럼 보이는 버튼이 절대 노출되지 않는다 |
| G2 | 카카오 로그인 상태 표현 책임을 `app/login/page.tsx` 한 곳으로 모은다 |
| G3 | 콜백이 카카오의 실측 이상값(`"NaN"` 닉네임)과 차단 계정을 방어한다 |
| G4 | 카카오 개발자 콘솔 심사 담당자가 플래그와 무관하게 실제 로그인 화면을 볼 수 있다 |
| G5 | `NEXT_PUBLIC_KAKAO_ENABLED=false` 유지 (실제 키 발급은 이번 범위 밖) |

---

## 3. 기능 요구사항

### FR-01 — 로그인 화면 단일 분기 (G1, G2)

`app/login/page.tsx`에서 `KAKAO_ENABLED` 삼항 분기 하나로 처리한다.

- `KAKAO_ENABLED === true` → `<LoginConsentGate next={next} />`만 렌더링
- `KAKAO_ENABLED === false` → 준비중 박스만 렌더링, `LoginConsentGate`는 렌더 트리에 진입하지 않음

두 요소가 동시에 렌더링되는 경로가 코드상 존재하지 않아야 한다.

### FR-02 — `LoginConsentGate` prop 정리 (G2, G4)

- `kakaoEnabled` prop 제거. 카카오 활성 여부는 상위(페이지)가 결정하므로 이 컴포넌트에는 죽은 분기다.
- `disabled` 전달은 **동의 미완료** 목적으로만 유지한다.
- 심사 페이지 재사용을 위해 `forceButtonEnabled?: boolean` prop 추가. `true`면 동의 여부와 무관하게 버튼을 활성 렌더링한다(클릭 시 버튼 내부 `hasRequiredConsent` 가드가 한국어 안내를 표시).

### FR-03 — `KakaoLoginButton` 비활성 시각 구분 (G1)

`disabled` 상태에서 카카오 브랜드 옐로(`#FEE500`)를 그대로 쓰지 않는다. 비활성 시 중립 토큰(`canvas-subtle` 배경 / `muted-light` 텍스트 / `hairline` 보더)으로 전환해 활성 버튼과 한눈에 구분되게 한다. SVG는 `currentColor`를 따라간다.

브랜드 컬러 하드코딩은 카카오 브랜드 가이드 강제값이므로 예외로 유지하되 주석으로 근거를 남긴다.

### FR-04 — 콜백: 이름 폴백 체인 + `"NaN"` 정규화 (G3)

`app/auth/callback/route.ts`

- 이름 추출 키 순서를 `full_name → name → nickname → preferred_username`으로 확장한다.
- 메타데이터 문자열 판독 시 값이 리터럴 `"NaN"`이면 미제공으로 취급한다(카카오가 닉네임 미동의 시 반환하는 실측 값). 정규화는 `readMetadataString` 한 곳에서 수행하며, 이름뿐 아니라 `avatar_url` / `kakao_id` 판독에도 동일하게 적용된다.
- 기존 유저 백필: 정규화 도입 이전에 가입해 `profile_data.name`이 비어 있거나 `"NaN"`으로 저장된 계정은 재로그인 시 정상 값으로 교정한다. 이미 정상 이름이 있는 계정은 덮어쓰지 않는다(기존 백필 규칙 유지).

### FR-05 — 콜백: 차단 계정 분기 (G3)

`exchangeCodeForSession` 실패 시 에러 메시지에 `banned`가 포함되면(대소문자 무시) 일반 로그인 실패와 다른 안내로 분기한다.

**스키마 조사 결과**: `public.users`에 탈퇴/차단 상태 컬럼이 없고 자체 탈퇴 플로우도 없다. 그러나 referio의 이 분기는 **Supabase Auth 레이어**(`auth.users.banned_until`)의 에러 문자열을 읽는 것이라 스키마 변경이 전혀 필요 없다. 따라서 스키마는 건드리지 않고 분기만 추가한다.

**referio와의 의도적 차이**: referio는 `?error=withdrawn` 코드를 넘기지만, 퍼즐의 `/login`은 `searchParams.error`를 그대로 화면에 출력하는 기존 규약을 쓴다. 코드 문자열을 넘기면 사용자에게 "withdrawn"이 그대로 노출되므로, 퍼즐은 기존 규약을 지켜 한국어 메시지를 넘긴다.

### FR-06 — `next` 파라미터 화이트리스트 공용화 (G3)

현재 `app/login/page.tsx`의 `sanitizeNext`, `app/auth/callback/route.ts`의 `safeNext`, `app/admin/login/page.tsx`의 `sanitizeNext`가 동일 로직을 세 벌 중복 구현하고 있고 규칙도 서로 미묘하게 다르다. `lib/safe-next.ts`로 단일 함수를 추출해 로그인 페이지 · 심사 페이지 · 콜백 · 어드민 로그인이 모두 같은 규칙을 쓴다.

어드민 로그인은 이번 작업의 카카오 범위 밖이지만, 같은 취약점 클래스의 가장 느슨한 사본(백슬래시 미검사)을 남겨두면 FR-06의 근거 자체가 무너지므로 함께 통합한다. 기본 목적지(`/admin`) 폴백 동작은 그대로 유지한다.

규칙(2단계):

1. **1차 거부** — `/`로 시작하지 않거나, `//`로 시작하거나, 백슬래시를 포함하면 거부.
2. **2차 정규화** — 더미 오리진 기준으로 `new URL()` 파싱 후 오리진이 유지되는지, 정규화된 `pathname`이 `//`로 시작하지 않는지 재확인하고, 원본이 아닌 **정규화된 경로**를 반환.

2차 정규화가 필요한 이유: URL 파서가 탭/개행 제어문자를 제거하고 `..` 세그먼트를 접기 때문에 `/\t/evil.com`, `/..//evil.com` 같은 입력이 1차 검사를 통과한 뒤 `//evil.com` **경로**로 붕괴한다. 서버 리다이렉트(`${origin}${path}`)에서는 같은 오리진이라 무해하지만, 같은 값이 클라이언트 라우터로 흘러가면 프로토콜 상대 URL로 해석될 수 있어 취약점 클래스 자체를 차단한다.

거부 시 `null` 반환, 호출처가 기본 목적지로 폴백.

### FR-07 — 카카오 심사 제출용 라우트 신규 (G4)

`NEXT_PUBLIC_KAKAO_ENABLED` 플래그를 무시하고 항상 카카오 버튼을 활성 렌더링하는 라우트를 추가한다.

| 라우트 | 용도 |
|--------|------|
| `/kakao-login` | 카카오 개발자 콘솔 심사 — 로그인 화면 URL |
| `/kakao-signup` | 카카오 개발자 콘솔 심사 — 가입 화면 URL |

퍼즐은 로그인과 가입이 단일 플로우이므로 두 라우트는 문구만 다른 공용 컴포넌트(`components/auth/KakaoReviewScreen.tsx`)를 공유한다. 동의 체크박스는 그대로 노출해 실제 프로덕션 동선과 동일하게 유지하고, 버튼만 `forceButtonEnabled`로 항상 활성 표시한다.

`robots`는 `noindex`로 지정해 심사용 화면이 검색에 노출되지 않게 한다.

### FR-08 — 미들웨어 비로그인 허용 (G4)

`middleware.ts`에서 `/kakao-login`, `/kakao-signup`을 명시적으로 통과시킨다.

- 현재 두 경로는 `PROTECTED_PAGES`에 없어 우연히 통과하지만, 향후 보호 경로가 추가될 때 깨질 수 있으므로 **명시적 조기 반환**으로 의도를 고정한다.
- `/login`과 달리 **로그인 상태여도 `/hub`로 리다이렉트하지 않는다**. 심사 담당자가 이미 세션을 가진 상태에서도 화면을 확인할 수 있어야 하기 때문이다.
- 온보딩 게이트 · 사업자인증 게이트 모두 적용 대상에서 제외된다.

---

## 4. 비기능 요구사항

| ID | 내용 |
|----|------|
| NFR-01 | `npx tsc --noEmit` 통과 |
| NFR-02 | `npm run build` 통과 |
| NFR-03 | 함수 30줄 이하, `any` 금지, 하드코딩 색상 금지(카카오 브랜드 컬러는 근거 주석 후 예외) |
| NFR-04 | 프리플라이트 검증(`canReachAuthorize`) 제거 금지 |
| NFR-05 | `.env.local`의 `NEXT_PUBLIC_KAKAO_ENABLED=false` 변경 금지 |
| NFR-06 | referio-platform 저장소 쓰기 금지 |

---

## 5. 변경 대상 파일

| 파일 | 구분 | 내용 |
|------|------|------|
| `lib/safe-next.ts` | 신규 | `sanitizeRedirectPath()` 공용 화이트리스트 (FR-06) |
| `app/login/page.tsx` | 수정 | 삼항 분기, `sanitizeNext` 제거 후 공용 함수 사용 (FR-01, FR-06) |
| `components/auth/LoginConsentGate.tsx` | 수정 | `kakaoEnabled` 제거, `forceButtonEnabled` 추가 (FR-02) |
| `components/auth/KakaoLoginButton.tsx` | 수정 | 비활성 시각 스타일 분리 (FR-03) |
| `components/auth/KakaoReviewScreen.tsx` | 신규 | 심사용 공용 화면 (FR-07) |
| `app/kakao-login/page.tsx` | 신규 | 심사용 로그인 라우트 (FR-07) |
| `app/kakao-signup/page.tsx` | 신규 | 심사용 가입 라우트 (FR-07) |
| `app/auth/callback/route.ts` | 수정 | 폴백 체인 + `"NaN"` 정규화 + banned 분기 + 공용 next (FR-04, FR-05, FR-06) |
| `middleware.ts` | 수정 | 심사 라우트 명시적 통과 (FR-08) |
| `app/admin/login/page.tsx` | 수정 | 중복 `sanitizeNext` 제거 후 공용 함수 사용 (FR-06) |

---

## 6. 검증 기준

| # | 항목 | 방법 |
|---|------|------|
| V1 | `/login`에 준비중 박스만 보이고 카카오 버튼이 없다 | dev 서버 실측 |
| V2 | `/kakao-login`, `/kakao-signup`에 카카오 버튼이 활성 상태로 보인다 | dev 서버 실측 |
| V3 | 심사 라우트가 미들웨어 게이트에 막히지 않는다(비로그인 200) | dev 서버 실측 |
| V4 | 타입 체크 통과 | `npx tsc --noEmit` |
| V5 | 프로덕션 빌드 통과 | `npm run build` |
| V6 | 설계-구현 Match Rate ≥ 90% | gap-detector |
| V7 | 인증 경로 신규 취약점 없음 | security-architect / code-analyzer |

---

## 7. 범위 밖 (명시)

- 카카오 개발자 콘솔 실제 앱 키 발급 및 `NEXT_PUBLIC_KAKAO_ENABLED=true` 전환 — 사용자가 외부에서 수행
- referio의 추천 쿠키 / 자동 프로그램 가입 / 카카오 채널 동기화
- `partners` 테이블 구조 및 3단계 조회 로직
- 회원 탈퇴 플로우 신규 구현 및 스키마 변경
