---
name: kakao-login-gating
description: 카카오 로그인은 프로덕션 검증 완료(플래그 true). /kakao-login·/kakao-signup 심사용 라우트를 지우면 안 되는 이유
metadata:
  type: project
---

카카오 로그인은 **프로덕션에서 실계정 로그인 성공이 확인된 상태**다(2026-08-27 사용자 확인).
`.env.local`의 `NEXT_PUBLIC_KAKAO_ENABLED`도 `true`다. `.env.example`만 `false`로 남아 있다.
(2026-08-27 이전 기록에는 "키 미발급이라 플래그 false 유지"로 적혀 있었으나 그 전제는 해소됐다.)

이 플래그를 **의도적으로 읽지 않고** 항상 카카오 버튼을 활성 렌더링하는 라우트가 따로 있다:
`/kakao-login`, `/kakao-signup` (`components/auth/KakaoReviewScreen.tsx`).

**Why:** 카카오 개발자 콘솔에 "로그인 화면 URL / 가입 화면 URL"로 제출된 심사 전용 경로다.
플래그가 다시 false로 돌아가더라도 심사 담당자에게는 활성 버튼이 보여야 한다.

**How to apply:** `/kakao-login`·`/kakao-signup`을 "중복 코드"로 보고 삭제하거나 `/login`으로 통합하지 마라.
대신 **구성은 항상 `/login`과 동일하게 유지**해라 — 심사에 제출한 화면과 실제 화면이 달라지면 심사에서 문제가 된다.
카카오 활성 여부의 화면 표현은 `app/login/page.tsx` 한 곳에서만 분기한다(과거에 하위 컴포넌트가
같은 판단을 중복해 "노란 활성 버튼 + 준비중 안내"가 동시에 그려지는 버그가 있었다).
관련: [[signup-only-consent]], [[referio-platform-reference-repo]]
