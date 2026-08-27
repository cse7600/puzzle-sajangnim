---
name: signup-only-consent
description: 약관 동의는 최초 가입 1회만 — /login이 아니라 로그인 후 /auth/consent 인터스티셜에서 받는다
metadata:
  type: project
---

동의(이용약관·개인정보처리방침·마케팅)는 **최초 가입 1회만** 받는다. 기존 유저 재로그인은 동의 화면 없이 통과한다.
`/login`에는 체크박스가 없다 — 카카오 버튼 + 약관 링크 안내 문구뿐이다.
실제 동의 UI는 `/auth/consent`(로그인 완료 후 인터스티셜)에 있고, 저장은 `/api/auth/consent`(인증 필수)가 한다.

**Why:** 로그인 시점에는 카카오 인증 전이라 신규/기존 판별이 불가능하다. 콜백의 `syncUserRow`만이
`public.users` 조회로 정확히 구분할 수 있다. 그래서 판별 기준을 "가입 시점"이 아니라
**`profile_data.consent` 기록의 유무**로 잡았다(과거 쿠키 유실로 consent 없이 만들어진 유저도 자동 구제).
과거 `puzl_consent` httpOnly 쿠키로 OAuth 왕복을 건너 전달하던 방식은 2026-08-27에 완전히 제거됐다.

**How to apply:** 동의 관련 요청이 오면 `/login`에 체크박스를 되살리지 마라 — PO가 명시적으로 반려한 UX다.
`backfillExistingUser`가 재로그인마다 consent를 덮어쓰게 만들지 마라(최초 1회 기록 후 불변,
마케팅 수신만 `/settings` 토글 → `PATCH /api/auth/consent`로 변경 + `agreed_at` 갱신).
`public.users`는 타 puzl 제품 공유 테이블이라 **SQL 컬럼 추가 금지**, `profile_data` jsonb 안에서만 다루고
갱신은 항상 기존 키 **병합**으로 한다(`referral_code`·`onboarded_at`·`total_points` 유실 사고 방지).
알려진 갭 2개(둘 다 의도적 범위 밖, 다시 "발견"했다고 보고하지 말 것):
1. `lib/email.ts`가 `consent.marketing`을 확인하지 않는다 — 마케팅성 발송을 붙일 때 수신거부 필터가 필요하다.
2. `/auth/consent`는 우회 가능하다. 도착 시점에 이미 세션이 있어 `/hub`를 직접 입력하면 동의 없이 들어간다.
   콜백 밖에서 consent를 확인하는 지점이 없다. 막으려면 `middleware.ts` 게이트 추가가 필요한데,
   그 파일은 이 저장소 최고 리스크 파일이라 라이브 로그인 회귀 비용을 이유로 보류했다.
설계·검증 기록: `.planning/PLAN_signup_only_consent.md`, `.planning/VERIFICATION_signup_only_consent.md`
관련: [[kakao-login-gating]], [[qa-mode-session-testing]]
