---
name: kakao-login-gating
description: NEXT_PUBLIC_KAKAO_ENABLED=false 유지 이유와 /kakao-login·/kakao-signup 심사용 라우트의 존재 이유
metadata:
  type: project
---

퍼즐 사장님의 `NEXT_PUBLIC_KAKAO_ENABLED`는 의도적으로 `false`다 (2026-08-27 기준).
그리고 이 플래그를 **무시하고** 항상 카카오 버튼을 활성 렌더링하는 라우트가 따로 있다:
`/kakao-login`, `/kakao-signup`.

**Why:** 카카오 개발자 콘솔 심사 담당자가 실제 로그인/가입 화면을 눈으로 봐야 심사가 진행된다.
그런데 실제 카카오 앱 키는 아직 발급 전이라 일반 사용자에게는 동작하지 않는 버튼을 보여줄 수 없다.
그래서 사용자 동선(`/login`)은 "준비 중" 안내만, 심사 동선은 항상 활성 버튼으로 분리했다.
키 발급과 플래그 전환은 사용자가 카카오 콘솔에서 외부적으로 처리할 일이다.

**How to apply:** 로그인 화면을 건드릴 때 `NEXT_PUBLIC_KAKAO_ENABLED`를 임의로 `true`로 바꾸지 마라.
`/kakao-login`·`/kakao-signup`을 "중복 코드"로 오해해 삭제하거나 `/login`으로 통합하지 마라 — 심사용이다.
카카오 활성 여부의 화면 표현은 `app/login/page.tsx` 한 곳에서만 분기한다(과거에 하위 컴포넌트가
같은 판단을 중복해서 "노란 활성 버튼 + 준비중 안내"가 동시에 그려지는 버그가 있었다).
관련: [[referio-platform-reference-repo]]
