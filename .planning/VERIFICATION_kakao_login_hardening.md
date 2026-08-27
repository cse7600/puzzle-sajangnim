# VERIFICATION — 카카오 로그인 하드닝 (kakao_login_hardening)

- 검증일: 2026-08-27
- 대상 계획: `.planning/PLAN_kakao_login_hardening.md`
- 검증 방식: 요구사항 정적 대조 + 오픈 리다이렉트 실행 테스트 + 타입/빌드 + dev 서버 실측

---

## 1. 요약

| 항목 | 결과 |
|------|------|
| Match Rate | **100% (14/14)** — FR-01~08, NFR-01~06 전 항목 충족 |
| Critical 이슈 | 0건 |
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 (51/51 static pages 생성) |
| dev 서버 실측 | 통과 (아래 3절) |
| 오픈 리다이렉트 페이로드 13종 | 유출 0건 (아래 3-4절) |

> **검증 신뢰도에 대한 고지**: 병렬로 위임한 gap-detector · security-architect 에이전트가
> 시간 내 응답하지 않아, 위 Match Rate는 **독립 교차검증이 아닌 자체 대조 결과**다.
> 이를 보완하려고 보안 핵심 주장(오픈 리다이렉트 방어)은 추론 대신 실제 모듈을 컴파일해
> 페이로드를 실행하는 방식으로 검증했다(3-4절). 상세는 5절 R-05 참고.

---

## 2. 요구사항별 대조

| FR | 내용 | 구현 위치 | 상태 |
|----|------|-----------|------|
| FR-01 | 로그인 화면 단일 삼항 분기 | `app/login/page.tsx:44` | 충족 |
| FR-02 | `kakaoEnabled` prop 제거, `forceButtonEnabled` 추가 | `components/auth/LoginConsentGate.tsx` | 충족 |
| FR-03 | 비활성 시 브랜드 옐로 제거, 중립 토큰 전환 | `components/auth/KakaoLoginButton.tsx` | 충족 |
| FR-04 | 이름 폴백 체인 + `"NaN"` 정규화 + 기존 유저 백필 | `app/auth/callback/route.ts` | 충족 |
| FR-05 | banned 계정 분기 | `app/auth/callback/route.ts` | 충족 |
| FR-06 | `next` 화이트리스트 공용화 (1차 거부 + 2차 정규화) | `lib/safe-next.ts` (+ 호출처 3곳) | 충족 |
| FR-07 | 심사용 라우트 2개 | `app/kakao-login/`, `app/kakao-signup/`, `components/auth/KakaoReviewScreen.tsx` | 충족 |
| FR-08 | 미들웨어 명시적 통과 | `middleware.ts` | 충족 |

### 잔여 참조 확인

`kakaoEnabled` · `sanitizeNext` · `safeNext` 식별자는 코드베이스 전역에서 0건으로 소멸했다.
`next` sanitize 호출처는 `app/login/page.tsx`, `app/admin/login/page.tsx`, `app/auth/callback/route.ts`
3개 파일 + 심사 화면(전달 없음)으로, 전부 `sanitizeRedirectPath` 단일 구현을 경유한다.

---

## 3. dev 서버 실측 결과

`NEXT_PUBLIC_KAKAO_ENABLED=false` (실제 `.env.local` 값, 변경하지 않음):

| 경로 | HTTP | 카카오 버튼 | 준비중 박스 | 브랜드 옐로(#FEE500) |
|------|:----:|:-----------:|:-----------:|:--------------------:|
| `/login` | 200 | 0건 | 노출 | 0건 |
| `/kakao-login` | 200 | 1건 | 0건 | 1건 (활성) |
| `/kakao-signup` | 200 | 1건 | 0건 | 1건 (활성) |
| `/admin/login` | 200 | - | - | - |

**핵심 회귀 확인**: `/login`에서 카카오 버튼과 준비중 박스가 동시에 나오던 모순이 해소됐다.
버튼 자체가 렌더 트리에 진입하지 않으며 브랜드 옐로도 0건이다.

**심사 라우트 버튼 상태** (`/kakao-login` 실제 HTML):

```html
<button type="button" class="... bg-[#FEE500] text-[#191919] hover:bg-[#e6cf00]">
```

`disabled` 속성이 없고 활성 클래스가 적용된다. 비활성 클래스(`cursor-not-allowed`)는 0건.
비로그인 상태에서 200으로 응답하므로 미들웨어 게이트에 막히지 않는다.

### 플래그 활성 시 동작 (임시 포트 3111, `.env.local` 미변경)

`NEXT_PUBLIC_KAKAO_ENABLED=true`로 띄운 `/login`:

- 카카오 버튼 1건, 준비중 박스 0건 → 분기가 정상 반전
- 동의 전 버튼 상태: `disabled=""` + `bg-canvas-subtle text-muted-light border border-hairline cursor-not-allowed`
  → 비활성이 시각적으로 명확히 구분된다 (기존 `disabled:opacity-60` 옐로 유지 문제 해소)

### 3-4. 오픈 리다이렉트 실행 테스트

`lib/safe-next.ts`를 실제로 컴파일해, 콜백의 코드 경로(`new URL(request.url).searchParams` →
`sanitizeRedirectPath` → `${origin}${destination}` 결합)를 그대로 재현한 뒤 페이로드 13종을 실행했다.

| 페이로드 | 최종 리다이렉트 |
|----------|-----------------|
| `//evil.com` | `/hub` (폴백) |
| `///evil.com` | `/hub` |
| `/%5Cevil.com` (백슬래시) | `/hub` |
| `/%5c/evil.com` | `/hub` |
| `/%2f%2fevil.com` | `/hub` |
| `%2f%2fevil.com` | `/hub` |
| `https%3A%2F%2Fevil.com` | `/hub` |
| `/%09/evil.com` (탭 문자) | `/hub` |
| `/..//evil.com` (경로 traversal) | `/hub` |
| `/%0d%0aSet-Cookie:pwned%3D1` (CRLF) | `/Set-Cookie:pwned=1` (제어문자 제거, 헤더 주입 없음) |
| `/hub%23@evil.com` | `/hub#@evil.com` (동일 오리진) |
| `/hub` | `/hub` (정상 통과) |
| `/team-buy/123?tab=1` | `/team-buy/123?tab=1` (정상 통과, 쿼리 보존) |

**오프오리진 유출 0건 / 13건.**

이 테스트 과정에서 실제 결함 1건을 발견해 수정했다. 1차 구현(문자열 접두사 검사만)에서는
`/%09/evil.com`과 `/..//evil.com`이 검사를 통과한 뒤 URL 파서가 제어문자를 제거하고 `..`를
접으면서 `//evil.com` **경로**로 붕괴했다. 서버 리다이렉트에서는 오리진이 유지돼 실제 유출은
없었지만, 같은 값이 클라이언트 라우터로 흘러가면 프로토콜 상대 URL로 해석될 수 있는 잠재 결함이라
2차 정규화 단계(더미 오리진 기준 `new URL()` 파싱 → 오리진·`pathname` 재검증 → 정규화된 경로 반환)를
추가해 취약점 클래스 자체를 제거했다.

### 어드민 로그인 폴백 실측

`/admin/login?next=//evil.com`, `/admin/login?next=/..//evil.com` 모두 폼에 전달되는 next가
`/admin`으로 폴백한다. 외부 호스트가 살아남지 않는다.

---

## 4. referio 대비 의도적 차이 (이식하지 않음 / 다르게 구현함)

| 항목 | referio | 퍼즐 | 근거 |
|------|---------|------|------|
| banned 에러 전달 | `?error=withdrawn` 코드 | 한국어 메시지 문자열 | 퍼즐 `/login`은 `searchParams.error`를 그대로 출력하는 기존 규약. 코드를 넘기면 "withdrawn"이 사용자에게 그대로 노출된다 |
| 이메일 없는 유저 | null-email 허용 | `kakao_<id>@no-email.puzl.local` + 온보딩 실제 이메일 강제 | 퍼즐 자체 패턴이 이미 동작 중 |
| 유저 테이블 | `partners` 전용 3단계 조회 | `public.users` + `profile_data` jsonb | 스키마 구조가 다름 |
| authorize 프리플라이트 | 없음 | `canReachAuthorize` 유지 | 퍼즐에만 있는 방어 코드, 제거 금지 지시 |
| 추천 쿠키 / 자동 프로그램 가입 / 채널 동기화 | 있음 | 이식 안 함 | 범위 밖 명시 |
| scope | `profile_nickname account_email` | 동일 | 변경 불필요 |

---

## 5. 남은 리스크 / 향후 과제

### R-01. 회원 탈퇴 플로우 부재 (Major, 향후 과제)

`public.users`에 탈퇴/차단 상태 컬럼이 없고 자체 탈퇴 플로우도 구현돼 있지 않다.
FR-05의 banned 분기는 **Supabase Auth 레이어**(`auth.users.banned_until`)의 에러 문자열을 읽는 방식이라
스키마 없이 동작하지만, 현재는 **관리자가 Supabase 대시보드에서 수동 차단한 계정**에서만 발동한다.
사용자 주도 탈퇴를 지원하려면 별도 설계가 필요하다. 이번 범위에서는 스키마를 건드리지 않았다.

### R-02. banned 분기 실경로 미검증 (Minor)

실제 차단 계정을 만들어 코드 교환을 실패시키는 E2E 검증은 하지 않았다.
Supabase 에러 메시지 문자열(`banned` 포함)에 의존하므로, Supabase 측 메시지 문구가 바뀌면
일반 로그인 실패 안내로 폴백된다. 폴백이 안전한 방향(로그인 차단 유지)이라 위험도는 낮다.

### R-03. 카카오 실제 키 미발급 (범위 밖, 사용자 작업)

`NEXT_PUBLIC_KAKAO_ENABLED=false` 그대로다. 심사 통과 후 사용자가 Supabase 대시보드에
카카오 앱 키/시크릿을 등록하고 플래그를 `true`로 바꿔야 실제 로그인이 동작한다.
심사 제출용 URL은 `/kakao-login`(로그인 화면), `/kakao-signup`(가입 화면)을 쓰면 된다.

### R-05. 독립 교차검증 미완료 (Minor)

Check 단계에 위임한 gap-detector · security-architect 에이전트가 시간 내 응답하지 않아,
설계-구현 대조와 보안 리뷰를 자체 수행했다. 자기 구현을 자기가 검증한 구조라 확증 편향이
남아 있다. 이를 줄이려고 보안 핵심 주장은 실행 테스트로 대체했고(3-4절), 그 과정에서 실제로
결함 1건을 찾아 수정했다. 그래도 다음 세션에서 독립 리뷰를 한 번 돌리는 편이 안전하다.

### R-04. `"NaN"` 정규화 범위 (Minor)

정규화는 `readMetadataString` 한 곳에 있어 이름뿐 아니라 `avatar_url` / `kakao_id` 판독에도 적용된다.
카카오가 `"NaN"`이 아닌 다른 이상값(예: `"null"`, `"undefined"` 문자열)을 보낼 경우는 방어하지 않는다.
실측된 값만 방어한다는 원칙을 따랐다.

---

## 6. 범위 외 추가 변경 1건

`app/admin/login/page.tsx`의 자체 `sanitizeNext`(백슬래시 미검사로 셋 중 가장 느슨했음)를
공용 `sanitizeRedirectPath`로 통합했다. 카카오 범위 밖이지만 동일 취약점 클래스의 사본을
남겨두면 FR-06의 근거 자체가 무너지므로 함께 처리했다. 기본 목적지 `/admin` 폴백 동작은 그대로다.
