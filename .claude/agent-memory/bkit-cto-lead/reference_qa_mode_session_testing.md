---
name: qa-mode-session-testing
description: 카카오 OAuth 없이 로컬에서 인증 세션을 만드는 법 — QA 모드 쿠키 2장 서명
metadata:
  type: reference
---

로그인 이후 화면/API를 dev 서버에서 실측해야 하는데 카카오 OAuth 왕복은 자동화할 수 없다.
해법: `lib/admin-session.ts`의 QA 모드 경로를 쓴다. `ADMIN_SESSION_SECRET`으로 jose HS256 JWT 2장을 서명해
쿠키로 붙이면 `getSessionUser()`가 `QA_USER_ID` 유저로 응답한다.

- `admin_entry_session` = `{ scope: 'admin-entry' }`
- `qa_mode_session` = `{ scope: 'qa', uid: <QA_USER_ID> }`  ← uid는 반드시 `QA_USER_ID`와 일치해야 통과
- 둘 다 있어야 한다. QA 쿠키만으로는 권한 상승이 차단된다.

`QA_USER_ID`(`.env.local`)는 `00000000-0000-0000-0000-000000000001` = `demo@puzzle.kr` 데모 계정이고
`public.users`에 실제 행이 있다. `profile_data`에 `referral_code`·`total_points`·`onboarded_at` 등이
채워져 있어 **jsonb 병합 저장이 다른 키를 보존하는지 검증하기 좋은 표본**이다.

**How to apply:** 인증 필요한 화면/라우트를 실측할 때 이 방법을 쓰고, 끝나면 데모 유저의 `profile_data`를
원래 스냅샷으로 **반드시 복구해라**(실 DB의 공유 테이블이다). 임시 스크립트는 `@supabase/supabase-js`·`jose`를
찾으려면 프로젝트 루트에서 실행해야 하므로, 루트에 `.tmp-*.mjs`로 두고 작업 후 삭제한다.
주의: 로컬 3000 포트를 다른 세션이 이미 쓰고 있을 수 있다 — dev 로그에서 실제 포트를 확인하고 그 포트로 붙어라.
관련: [[signup-only-consent]]
