---
name: referio-platform-reference-repo
description: referio-platform은 카카오 로그인 검증된 실서비스 참고 저장소 — 읽기 전용, 절대 쓰기 금지
metadata:
  type: reference
---

`/Users/hokang2father/레페리오/referio-platform` — 사용자의 다른 실서비스 저장소.
referio.puzl.co.kr로 라이브 운영 중이며 카카오 로그인이 프로덕션에서 검증된 상태.
퍼즐 사장님과 스택이 같다(Next.js + `@supabase/ssr` + Supabase Auth `signInWithOAuth({provider:'kakao'})`).

**Why:** 퍼즐 사장님의 인증 구현을 끌어올릴 때 사용자가 "100% 참고하라"고 지정한 검증된 레퍼런스다.
동시에 다른 Claude 세션이 이 저장소에서 작업 중일 수 있어, 쓰기가 발생하면 남의 작업을 깨뜨린다.

**How to apply:** 인증/카카오 관련 패턴이 필요하면 이 저장소를 **읽기만** 해라.
파일 수정, clone, copy, git 명령 모두 금지. 참고한 패턴은 퍼즐 구조에 맞게 각색해서 퍼즐 쪽에만 쓴다.
referio 고유 비즈니스 로직(추천 쿠키, 자동 프로그램 가입, 카카오 채널 동기화, `partners` 전용 테이블)은
퍼즐로 이식하지 않는다 — 사용자가 명시적으로 범위 밖으로 선언했다.
관련: [[kakao-login-gating]]
