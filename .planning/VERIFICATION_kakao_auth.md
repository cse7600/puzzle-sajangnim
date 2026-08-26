# 카카오 로그인 + 온보딩 + 수신 이메일 — 구현/검증 기록

작성일: 2026-08-26 / 브랜치: `fix/naver-place-apollo-state`

전환 내용: 하드코딩 `DEMO_USER_ID` 단일 유저 → Supabase Auth(카카오 OAuth) 기반 실제 멀티유저.

## 사전 DB 실측 (설계 근거)

Management API로 라이브 DB를 먼저 조회해 설계를 확정했다. 파일 마이그레이션과 실 DB가 어긋난 전례가 있어 파일을 신뢰하지 않았다.

| 확인 항목 | 실측 결과 | 설계에 미친 영향 |
|---|---|---|
| `auth.users` 트리거 | `on_auth_user_created`(→`cashpick`), `mf_*`(→`milliefeed`) 3건 존재. **전부 다른 스키마에만 insert** | `public.users`를 채우는 트리거가 없음 → 콜백 라우트가 직접 insert |
| `public.users` 컬럼 | `id, email(NOT NULL), role, profile_data(jsonb), created_at, updated_at` | 프로필 확장 필드는 전부 `profile_data`에 저장, 컬럼 추가 없음 |
| `users.role` CHECK | `IN ('advertiser','publisher','admin')` | 일반 사장님 가입은 `role = NULL`. 임의 값 사용 불가 |
| `users.email` | NOT NULL, UNIQUE 없음 | 카카오가 이메일 미제공 시 `kakao_<id>@no-email.puzl.local` 폴백 |
| `public.users` RLS | 활성 | 서버 쓰기는 전부 service role 클라이언트 경유 |
| `business_verifications` RLS | 활성 + 정책 0건(전면 차단) | 미들웨어 게이트가 request-bound 클라이언트로는 조회 불가 → service role 사용 |
| 행 수 | `auth.users` 146 / `public.users` 29 (타 제품과 공유) | insert는 멱등, 파괴적 변경 금지 |

## 구현

**인증 인프라** — `@supabase/ssr` 신규 의존성
- `lib/supabase/client.ts` (브라우저), `lib/supabase/server.ts` (서버), `lib/supabase/middleware.ts` (`updateSession`)
- `lib/supabase/users-admin.ts` — `types/database.ts`의 `users` 타입이 실 스키마와 어긋나 postgrest 제네릭이 붕괴하는 문제를 `Omit`/교차 타입 파생으로 우회
- `lib/auth-server.ts` — `getSessionUser()`(`getUser()` 사용, `getSession()` 아님), `unauthorizedResponse()`, `forbiddenResponse()`
- `lib/is-admin-email.ts` — Edge 번들 안전하도록 의존성 없이 분리

**미들웨어** (`middleware.ts`) — 게이트 5단, 순서대로
1. 비로그인: 보호 페이지 → `/login?next=`, 보호 API → 401 JSON (API는 리다이렉트하지 않음)
2. 로그인 상태로 `/login` 접근 → `/hub`
3. 어드민 게이트: `/admin`, `/api/admin/*` → `app_metadata.role === 'admin'` 또는 `ADMIN_EMAILS` 포함
4. 온보딩 미완료 → `/onboarding`
5. `business_verifications.status !== 'approved'` → `/settings` (어드민 우회)

게이트 4·5는 service role 클라이언트로 DB 조회. `business_verifications`가 정책 0건 전면 차단이라 request-bound 클라이언트로는 조회가 불가능해 선택지가 없었다. 기존 클라이언트 사이드 게이트(`app/(app)/layout.tsx`의 `useVerificationGate`)는 서버 사이드로 승격되면서 제거 — 중복 검사/이중 깜빡임 방지.

**로그인/온보딩 플로우**
`/login` → 카카오 동의 → `/auth/callback` → (신규면 `public.users` insert + 환영 메일) → `/onboarding` → `/settings`(사업자 인증, 기존 구현 그대로) → `/hub`

- `components/auth/KakaoLoginButton.tsx` — `NEXT_PUBLIC_KAKAO_ENABLED !== 'true'`면 버튼을 숨기고 "준비 중" 안내
- `app/onboarding/page.tsx` — 이름 / 연락처(자동 하이픈 + `01[0-9]-\d{3,4}-\d{4}`) / 알림 수신 이메일(카카오 이메일과 별도 지정 가능). 서버에서 재검증
- `lib/email.ts` — Resend REST 직접 호출(`resend` 패키지 미추가). `RESEND_API_KEY` 없으면 경고 후 skip, 절대 throw하지 않음

**DEMO_USER_ID 제거** — `lib/auth.ts` 삭제, 33개 API 라우트를 세션 기반으로 교체. `grep -rn "DEMO_USER_ID\|demo-user-001\|getCurrentUser" app lib components` → 0건.

## 발견·수정한 인가 취약점

스윕 과정에서 IDOR 계열 8건을 발견해 수정했다. 브리핑에서 지목된 것은 1건뿐이고 나머지는 감사 중 발견.

| 라우트 | 취약점 | 수정 |
|---|---|---|
| `paybacks/statement` | 인증 없이 임의 `user_id`로 타인 정산 PDF 조회 | 세션 필수, `user_id` 파라미터는 어드민만 |
| `place/keywords` GET | 임의 `registration_id`로 타인 키워드 조회 | 소유권 검사 |
| `place/keywords` DELETE | 임의 `id`로 타인 키워드 삭제 | 소유권 검사 |
| `place/rankings` GET | 타인 순위 시계열 노출 | 소유권 검사 |
| `place/snapshots` GET | 타인 스냅샷 이력 노출 | 소유권 검사 |
| `ad-accounts?scope=all` | 전체 유저 광고계정 노출 | 어드민 전용 |
| `paybacks?scope=all` | 전체 유저 정산 노출 | 어드민 전용 |
| `ad-accounts/[id]`, `transfer-status`, `paybacks/generate`, `paybacks/[id]`, `settlement-config PATCH`, `admin/users*` | 인증 자체가 없었음 | 세션 + 어드민 게이트 |

## 검증 (실행 기반, 목킹 없음)

`npx tsc --noEmit` 통과, `npm run build` 성공(46 라우트).

**비로그인 실 HTTP**: `/hub /dashboard /admin /settings /onboarding` → 307 `/login?next=…`. `/`와 `/login` → 200(랜딩 공개 유지). API 47개 전부 401, 200/500 없음.

**로그인 상태**: 폐기용 auth 유저를 만들어 `@supabase/ssr` 실제 세션 쿠키를 조립해 게이트를 전부 구동.
- `public.users` 행 없음 → `/hub` → 307 `/onboarding`
- 온보딩 완료 + 인증 없음 → `/dashboard` → 307 `/settings`, `/settings`·`/onboarding`은 200
- `approved` 행 삽입 → `/dashboard` 200
- 비어드민 → `/admin` 307, `/api/admin/users` 403 → `app_metadata.role='admin'` 부여 후 200 (`getUser()` 재검증 덕에 토큰 재발급 불필요)
- 크로스 유저: `statement?user_id=<타인>` 403, 타인 `registration_id` 404

**온보딩 왕복**: `010-12-34` → 400 `{"phone":"연락처 형식이 올바르지 않습니다 (예: 010-1234-5678)"}`. 유효 payload → 200, SQL 재조회로 병합 확인 + 기존 `referral_code` 보존 확인(덮어쓰기 없음).

**회귀**: 정산내역서 PDF `%PDF-1.3` 매직바이트 30,438바이트 정상, 허브(ad-accounts/paybacks), 사업자 인증, 어드민 사용자 관리 전부 동작.

**이메일**: Resend 실발송 message id `e20bee02-00a4-4393-bd70-464047ac919b`, 이후 API 조회로 `last_event: delivered` 확인.

모든 폐기 테스트 유저와 생성 행은 삭제 후 재조회로 잔여 0건 증명. 공유 DB이므로 스키마 변경은 일절 없었고 조회는 읽기 전용만 사용.

## 검증 중 발견해 고친 결함

1. **카카오 ON + provider 미설정 시 흰 JSON 화면** — `signInWithOAuth`가 즉시 리다이렉트해 Supabase 원시 400 JSON에 착지했다. `skipBrowserRedirect: true` + authorize URL 프리플라이트로 교체해 한국어 에러를 표시하도록 수정 (`components/auth/KakaoLoginButton.tsx`).
2. **온보딩 탈출 불가 상태** — auth 유저는 있는데 `public.users` 행이 없으면(콜백 insert 실패 등) 온보딩 GET/POST가 500을 반환해 영구히 갇혔다. `ensureProfile()` 자가 복구 경로 추가 (`app/api/users/onboarding/route.ts`). 행 없는 유저로 실측 재검증: GET 200 + 행 생성, POST 200 + 병합, `/hub` → `/settings`로 루프 해소.

## 미검증 — 카카오 앱 등록 대기

실제 OAuth 왕복(`exchangeCodeForSession`, 신규 유저 upsert, 환영 메일 트리거)은 Supabase에 Kakao provider가 없어 실행 불가. `authorize?provider=kakao` → `400 "Unsupported provider: provider is not enabled"` 확인. 따라서 콜백의 카카오 메타데이터 추출 로직(`name`/`nickname`/`avatar_url`/`provider_id`)은 실제 페이로드로 검증되지 않았다.

절차: `.planning/KAKAO_SETUP_GUIDE.md`

---

# 추가 요구사항 (2026-08-26): 어드민 비밀번호 게이트 + QA 사용자뷰

## 1. 어드민 진입 비밀번호 게이트

기존 카카오/`ADMIN_EMAILS` 어드민 경로와 **공존**한다. 둘 중 하나만 통과해도 어드민 인정.

- 비밀번호 평문은 코드/DB/env 어디에도 저장하지 않는다. bcrypt(cost 12) 해시를 base64로 감싸 `ADMIN_ENTRY_PASSWORD_HASH_B64`로 `.env.local`에만 보관. base64로 감싼 이유는 bcrypt 해시의 `$` 문자가 dotenv 확장으로 깨지기 때문.
- `app/api/admin/login/route.ts` — Node 런타임(bcrypt는 Edge 불가), 서버에서만 `bcrypt.compare`. 해시는 클라이언트로 전송하지 않는다.
- 성공 시 `jose` HS256 서명 쿠키 `admin_entry_session`(8h, httpOnly, prod에서 secure, sameSite=lax) 발급. 미들웨어(Edge)에서 검증해야 하므로 `jsonwebtoken`(Node 전용) 대신 `jose` 사용.
- `lib/admin-rate-limit.ts` — IP당 10분 10회. 인메모리라 서버리스 다중 인스턴스에서는 인스턴스별로 분리됨(알려진 한계).
- `/admin/login`, `/api/admin/login`은 어드민 게이트에서 제외(리다이렉트 루프 방지).

## 2. QA 사용자뷰 전환

어드민 UI의 "사용자 대시보드로 넘어가기" → 일반 사장님 화면을 그대로 체험. 본질적으로 impersonation 기능이므로 아래 제약을 강제한다.

- `POST /api/admin/qa-mode`는 **서버에서 어드민 증명을 재검증한 뒤에만** `qa_mode_session` 쿠키(4h, httpOnly) 발급. 쿼리 파라미터/클라이언트 플래그는 일절 신뢰하지 않는다.
- **QA 쿠키 단독으로는 아무 권한도 없다.** 미들웨어와 `getSessionUser()` 양쪽이 QA 쿠키와 어드민 증명을 **함께** 요구한다. 어드민 증명이 만료되면 QA 모드도 즉시 죽는다.
- QA 모드에서 `getSessionUser()`는 `{ id: QA_USER_ID, email, isAdmin: false }`를 반환한다. `isAdmin: false`는 의도적 — 일반 유저와 동일한 화면을 보게 되고 어드민 API는 정상적으로 403이 된다. 기존 33개 라우트는 수정 없이 QA 유저로 스코프된다.
- 미들웨어는 어드민 증명 + QA 쿠키가 모두 유효할 때만 게이트 1·4·5를 건너뛴다. 게이트 3은 그대로 살아 있어 `/admin`으로 돌아갈 수 있다.
- QA 대상은 `00000000-0000-0000-0000-000000000001`(구 DEMO_USER_ID). `auth.users`/`public.users` 양쪽에 존재하고 ad_accounts 2 / paybacks 2 / business_verifications 2건의 실데이터 보유를 사전 확인했다 — 빈 화면이 아니라 실제 화면이 렌더링된다.
- 상단바에 "QA 모드 — 관리자" 배지 + 종료 버튼. 서버가 내려주는 플래그 기반이라 실유저에게는 렌더링되지 않는다.

## 검증에서 발견한 권한 상승 취약점 (수정 완료)

**임의 사용자 가장(arbitrary-uid impersonation)** — QA 쿠키 검증부가 `uid` 클레임을 무검증 신뢰했다. `ADMIN_SESSION_SECRET`을 아는 주체가 타인의 UUID로 QA 쿠키를 서명하면 그 사용자를 그대로 가장할 수 있었다. 실증: 실제 유저 `cse7600@gmail.com`의 uid로 위조한 쿠키로 `/api/users/me`가 해당 유저 신원을 반환하고 `/hub`가 200을 반환.

발급 라우트는 언제나 `QA_USER_ID`만 서명했지만 **검증부가 uid를 제약하지 않은 것**이 근본 원인이었다. `lib/admin-session.ts`의 `verifyQaModeCookie`가 `uid === QA_USER_ID`를 강제하도록 수정 — 서명이 유효해도 uid가 고정 샌드박스 유저가 아니면 거부한다. 수정 후 위조 uid 전부 차단, 정규 QA만 통과 확인.

## 공격 시나리오 검증 결과

| 시나리오 | 결과 |
|---|---|
| QA 쿠키만(어드민 증명 없음) | 차단 — `/hub` 307, `/api/ad-accounts` 401, `/admin` 307 |
| 다른 시크릿으로 서명한 QA 쿠키 | 차단(서명 무효) |
| **올바른 시크릿 + 타인 uid** | **원래 취약 → 수정 후 차단** |
| `alg:none` / garbage JWT | 차단 |
| 만료 토큰(실 시크릿 서명) | 차단 |
| httpOnly | 두 쿠키 모두 적용 확인 |
| QA 모드에서 어드민 API | 403 / 405 |
| QA 모드에서 기존 IDOR 경로 | 전부 차단(`scope=all` 403, 타인 `user_id` 403, 소유권 검사 유지) |

실제 설정된 해시가 운영 비밀번호를 accept하는지 별도 확인(구현 에이전트는 임시 해시로만 테스트했음). 근접 오답(대소문자 변형, `!` 누락)은 거부. 오답 11회 → 429.

QA 모드 실사용성: `/hub` `/dashboard` `/settings` `/earnings` 200 + 실데이터, `/api/ad-accounts` 2건, `/api/paybacks` 2건, 정산 PDF `%PDF` 매직바이트 31KB. 배지 HTML 렌더 확인, 일반 유저에는 미노출.

회귀: 미인증 리다이렉트, 실 Supabase 세션 유저의 게이트 4·5, 온보딩 자가복구, `referral_code` 보존, 카카오 비활성 시 `/login` 안내 전부 유지.

## 남은 리스크

1. **공유 비밀번호 방식(설계상 한계)** — 비밀번호 하나로 누구나 full admin이 되고 개별 관리자 신원·감사 로그가 없다. 유출 시 회전 필요
2. **레이트리밋 인메모리** — 서버리스 다중 인스턴스 배포 시 인스턴스별 분리로 우회 가능. 공유 저장소(Redis 등) 필요
3. **`ADMIN_SESSION_SECRET`이 두 쿠키의 단일 신뢰근** — 유출 시 어드민 진입 및 QA(샌드박스 유저 한정) 위조 가능. 로그 마스킹·회전 정책 권고
4. 미들웨어가 보호 페이지마다 service role DB 조회 2회 — 트래픽 증가 시 캐싱 검토 필요
5. `app/api/**` 20곳의 `supabaseAdmin as any` — 이번 변경 이전부터 있던 패턴. `types/database.ts` 정합화로 해소 필요
6. `types/database.ts`의 `users` 타입이 실 스키마와 계속 어긋나 있음(이번엔 가산적으로만 보강)
