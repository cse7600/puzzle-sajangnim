# PLAN: 로그인 약관 동의 UI + 동의 상태 저장 흐름

작성일: 2026-08-27

## 배경

`.planning/VERIFICATION_kakao_auth.md` 기준으로 카카오 OAuth 로그인, 콜백, 온보딩, 미들웨어 5단 게이트,
QA 모드, 어드민 비밀번호 게이트는 이미 구현·검증 완료 상태다. 이번 작업은 그 위에 빠져 있는 조각 하나를 채운다.

현재 `app/login/page.tsx:45-51`은 실제 동의 절차 없이 "로그인 시 이용약관 및 개인정보 처리방침에 동의합니다"라는
문구만 렌더링한다. 링크가 아니라 `<span>`이고, 클릭해도 아무 데도 가지 않으며, 동의 여부가 어디에도 기록되지 않는다.
`components/Footer.tsx`의 법적고지 컬럼도 전부 `<a href="#">`인 죽은 링크다.

즉 **동의를 받은 기록이 0건**이고, **약관 원문 자체가 앱에 존재하지 않는다.**

`NEXT_PUBLIC_KAKAO_ENABLED`는 `false`다. 카카오 개발자 콘솔 앱 생성과 Supabase Kakao Provider 설정은
사용자가 외부에서 직접 처리할 일이라 이번 범위 밖이다(`.planning/KAKAO_SETUP_GUIDE.md`). 코드는 플래그가
`false`인 상태에서 완성해두고, 플래그를 켜는 순간 그대로 동작해야 한다.

## 범위

### 포함
- 로그인 화면 동의 체크박스 UI
- 이용약관 / 개인정보처리방침 페이지 (법무 검토 전 초안)
- Footer 법적고지 링크 연결
- 동의 상태를 OAuth 왕복을 건너 콜백까지 전달·저장하는 흐름

### 제외
- 카카오 개발자 콘솔 / Supabase Provider 설정 (사용자 담당, 범위 밖)
- 온보딩 화면 동의 UI (로그인 단계에서 이미 수집 — 중복 금지)
- `public.users`에 SQL 컬럼 추가 (타 puzl 제품과 공유 테이블 — `profile_data` jsonb 안에서만 확장)
- 위치기반서비스 약관, 청소년 보호정책, 환불 정책 (Footer에 항목은 있으나 이번 사이클 대상 아님)

## 요구사항

| ID | 요구사항 | 수용 기준 |
|---|---|---|
| FR-01 | 동의 체크박스 UI | 이용약관(필수), 개인정보처리방침(필수), 마케팅 정보 수신(선택) 3개 개별 체크박스 |
| FR-02 | 전체 동의 토글 | 국내 소셜로그인 관례. 전체 동의 체크 시 3개 모두 on, 개별 해제 시 전체 동의도 해제 |
| FR-03 | 약관 원문 링크 | 각 항목에서 `/legal/terms`, `/legal/privacy`로 `target="_blank" rel="noopener noreferrer"` 이동 |
| FR-04 | 필수 미동의 시 차단 | 카카오 버튼 비활성화 + 인라인 안내. `alert()`/`confirm()` 사용 금지 |
| FR-05 | 약관 페이지 | `app/legal/terms/page.tsx`, `app/legal/privacy/page.tsx`. 소상공인 마케팅 슈퍼앱 문맥. 법무 검토 전 초안임을 페이지 상단에 명시 |
| FR-06 | Footer 링크 연결 | 법적고지 컬럼의 이용약관/개인정보처리방침 죽은 링크를 실제 경로로 연결 |
| FR-07 | 동의 상태 기록 | 카카오 버튼 클릭 시 `POST /api/auth/consent` → httpOnly 쿠키 `puzl_consent` (JSON, 5분 만료) |
| FR-08 | 콜백 저장 | `app/auth/callback/route.ts`가 쿠키를 읽어 `profile_data.consent = {terms, privacy, marketing, agreed_at}` 저장 후 쿠키 삭제 |
| FR-09 | 재로그인 정책 | 기존 유저도 동의 UI를 거치며, 저장 시 최신 선택값으로 **갱신**(덮어쓰기) |
| FR-10 | 온보딩 무변경 | `app/onboarding/page.tsx`에 동의 UI를 추가하지 않는다 |

### 비기능 요구사항
| ID | 요구사항 |
|---|---|
| NFR-01 | 색상 하드코딩(`bg-[#...]`) 금지 — `tailwind.config.ts` 토큰(`ink`, `muted`, `hairline`, `primary` 등) 사용 |
| NFR-02 | 보라-파랑 그라데이션 금지 |
| NFR-03 | `any` 금지, 함수 30줄 이하 |
| NFR-04 | `console.log` 잔존 금지 |
| NFR-05 | `npx tsc --noEmit` + `npm run build` 통과 |

## 설계

### 왜 쿠키인가

동의는 로그인 **전에** 수집되는데, 저장 대상 유저는 로그인 **후에야** 확정된다. 그 사이에 카카오/Supabase를
거치는 3-홉 리다이렉트가 있어 클라이언트 메모리·React state는 전부 소멸한다. 선택지는 셋이었다.

| 방식 | 판단 |
|---|---|
| `redirectTo` 쿼리 파라미터에 동의값 첨부 | 기각. Supabase Redirect URL 허용목록과 충돌 가능성, URL·리퍼러·서버 로그에 동의 이력이 남음 |
| `sessionStorage` + 콜백 후 클라이언트에서 별도 POST | 기각. 콜백이 서버 리다이렉트라 클라이언트 코드가 개입할 지점이 없고, 실패 시 동의 유실 |
| **httpOnly 쿠키** | **채택.** 리다이렉트 왕복을 자동으로 따라오고, JS에서 조작 불가하며, 서버(콜백)에서 직접 읽힘 |

`sameSite`는 `lax`. 최종 착지(`supabase.co` → `/auth/callback`)가 **크로스사이트 top-level GET 내비게이션**이라
`strict`면 쿠키가 전송되지 않아 흐름이 조용히 깨진다. `lax`는 이 케이스를 허용한다.

만료 5분: 동의부터 콜백 착지까지는 정상 흐름에서 수십 초다. 5분은 카카오 화면에서 계정 전환 등으로
지체되는 경우까지 흡수하면서, 브라우저를 공유하는 다음 사람에게 앞사람의 동의가 승계될 창을 최소화한다.

### 데이터 형태

`public.users.profile_data`(jsonb)에만 저장한다. 공유 테이블이라 SQL 컬럼 추가는 금지.

```
profile_data.consent = {
  terms: boolean,
  privacy: boolean,
  marketing: boolean,
  agreed_at: string  // ISO 8601
}
```

`lib/profile.ts`의 `UserProfileData` 타입에 `consent?: UserConsent` 추가.

### 신뢰 경계

동의값은 **권한이 아니라 사용자 자기신고**다. 위조해서 얻을 수 있는 이득이 "동의하지 않았는데 동의한
것으로 기록됨"뿐이고, 이는 공격자 본인에게 불리한 방향이다. 따라서 서명(HMAC)은 과설계로 판단하되,
콜백은 쿠키를 **무조건 신뢰하지 않고** 형태 검증(boolean 3개 + 유효 ISO 시각)을 거친 뒤에만 저장한다.
필수 항목이 `false`인 페이로드는 저장하지 않고 폐기한다.
(security-architect 자문 결과를 실행 단계에서 반영 — 아래 "자문 반영" 절)

### 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `app/login/page.tsx` | 더미 문구 제거, 동의 UI 컴포넌트 + 카카오 버튼을 하나의 클라이언트 경계로 묶음 |
| `components/auth/ConsentCheckboxes.tsx` | 신규 — 체크박스 그룹 (전체동의/필수2/선택1) |
| `components/auth/LoginConsentGate.tsx` | 신규 — 동의 상태를 보유하고 카카오 버튼 활성/비활성을 제어하는 클라이언트 컨테이너 |
| `components/auth/KakaoLoginButton.tsx` | 동의값 props 수용, 클릭 시 `/api/auth/consent` 선행 호출, `disabled` 제어 |
| `app/api/auth/consent/route.ts` | 신규 — 동의 쿠키 발급 |
| `app/auth/callback/route.ts` | 쿠키 판독 → `profile_data.consent` 저장 → 쿠키 삭제 |
| `lib/consent.ts` | 신규 — 쿠키명/TTL 상수, 타입, 파싱·검증 함수 (클라이언트·서버 공용) |
| `lib/profile.ts` | `UserProfileData.consent` 타입 추가 |
| `app/legal/terms/page.tsx` | 신규 |
| `app/legal/privacy/page.tsx` | 신규 |
| `app/legal/layout.tsx` | 신규 — 약관 문서 공통 레이아웃 |
| `components/Footer.tsx` | 법적고지 링크 `href` 연결 |

### 미들웨어 영향

없음. `/legal`은 `PROTECTED_PAGES`에, `/api/auth`는 `PROTECTED_API_PREFIXES`에 각각 없으므로
기본적으로 공개다. 비로그인 사용자가 약관을 읽고 동의 쿠키를 받는 데 문제가 없다.
**미들웨어는 이번 작업에서 수정하지 않는다** — 과거 최고 리스크 지점으로 지목된 파일이다.

## 커밋 전략

1. `feat: 이용약관·개인정보처리방침 페이지 + Footer 법적고지 링크 연결`
2. `feat: 로그인 화면 약관 동의 체크박스 UI`
3. `feat: 동의 상태를 카카오 OAuth 왕복 너머 콜백까지 전달·저장`
4. `docs: 약관 동의 흐름 구현/검증 기록`

## 리스크

| 리스크 | 대응 |
|---|---|
| 카카오 앱 미등록(`NEXT_PUBLIC_KAKAO_ENABLED=false`)이라 실제 OAuth 왕복 검증 불가 | 쿠키 발급→판독→저장→삭제 구간을 실 HTTP로 개별 검증. 왕복 자체는 미검증으로 명시 |
| 이 저장소에 다크모드가 존재하지 않음(`dark:` 사용 0건, `darkMode` 미설정) | 아래 "다크모드 판단" 참고 |
| 약관 원문의 법적 유효성 | 법무 검토 전 초안임을 페이지 상단과 문서에 명시. 사업자 정보는 Footer의 기존 값과 일치시킴 |
| 공유 테이블 `profile_data` 동시 쓰기 클로버링 | 읽기-병합-쓰기로 기존 키 보존. 콜백은 `consent` 키만 갱신 |

### 다크모드 판단

지시에 "라이트/다크 대응"이 있었으나, 실측 결과 이 저장소에는 다크모드가 **전혀 없다**:
`grep -rn 'dark:' --include='*.tsx' app components` → 0건, `tailwind.config.ts`에 `darkMode` 미설정,
`globals.css`에 `prefers-color-scheme` 블록 없음.

Tailwind의 기본 `darkMode`는 `media`이므로, 여기에만 `dark:` 클래스를 넣으면 OS가 다크 모드일 때
**흰 카드 안의 동의 영역만 어두워지는** 깨진 화면이 된다. 따라서 `dark:` 클래스를 넣지 않고,
대신 모든 색을 CSS 변수 기반 토큰으로만 표현해 향후 앱 전역에 다크모드를 도입할 때 토큰 교체만으로
따라오도록 한다. 이 판단은 사용자에게 보고한다.

## 검증 계획

1. `npx tsc --noEmit`, `npm run build`
2. dev 서버 기동 후 실 HTTP
   - `/login` 200 + 체크박스 3개 + 전체동의 렌더 확인
   - `/legal/terms`, `/legal/privacy` 200 (비로그인)
   - `POST /api/auth/consent` → `Set-Cookie: puzl_consent` httpOnly/lax/Max-Age=300 확인
   - 잘못된 페이로드(필수 false, 타입 불일치) → 400
3. 콜백 저장 경로: 카카오 왕복 불가이므로 파싱·검증·병합 함수를 실 데이터로 직접 구동해 검증
4. `gap-detector`로 이 문서 대비 구현 Match Rate 측정 (목표 90% 이상)
