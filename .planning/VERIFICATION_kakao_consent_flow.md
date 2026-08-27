# 로그인 약관 동의 UI + 동의 상태 저장 흐름 — 구현/검증 기록

작성일: 2026-08-27 / 브랜치: `main`
설계 문서: `.planning/PLAN_kakao_consent_flow.md`

기존 카카오 OAuth 인증 기반(`.planning/VERIFICATION_kakao_auth.md`)은 이미 구현·검증 완료 상태였고,
이번 사이클은 그 위에 비어 있던 **법적 동의 수집** 조각만 채웠다. 인증 인프라·미들웨어·온보딩은 건드리지 않았다.

## 착수 전 상태

`app/login/page.tsx`에 "로그인 시 이용약관 및 개인정보 처리방침에 동의합니다"라는 문구가 `<span>`으로만 있었다.
클릭 대상이 아니었고, 약관 원문이 앱에 존재하지 않았으며, 동의 기록은 어디에도 남지 않았다.
`components/Footer.tsx` 법적고지 컬럼 6개 링크는 전부 `<a href="#">` 죽은 링크였다.

## 구현

### UI (커밋 `2cb95a6`, `83183e9`, `abb1b5d`)

- `components/auth/ConsentCheckboxes.tsx` — 전체 동의 마스터 토글 + 필수 2 + 선택 1. 네이티브 `<input type="checkbox">` 사용(div 가짜 체크박스 아님), `htmlFor`/`id` 연결, `focus-visible` 링 유지
- `components/auth/LoginConsentGate.tsx` — 동의 상태를 보유하고 카카오 버튼 활성/비활성을 제어하는 클라이언트 경계
- `app/legal/{terms,privacy}/page.tsx` + `content.ts` + `_components.tsx` + `layout.tsx` — 본문을 데이터 모듈로 분리해 페이지 컴포넌트를 짧게 유지
- `components/Footer.tsx` — 컬럼 자료구조에 선택적 `href` 도입, 이용약관/개인정보처리방침만 실제 경로 연결

마스터 토글의 `allChecked`는 **저장된 state가 아니라 세 자식으로부터 파생**된다. 개별 해제가 자동으로 마스터를
해제하는 양방향 동기화가 별도 코드 없이 성립하며, 두 state가 어긋나는 클래스의 버그가 구조적으로 불가능하다.

### 흐름 (커밋 `5d6fb27`)

동의는 로그인 **전에** 수집되는데 저장 대상 유저는 로그인 **후에야** 확정된다. 그 사이 카카오/Supabase를 거치는
3-홉 리다이렉트가 있어 클라이언트 state는 전부 소멸한다. httpOnly 쿠키를 택한 이유와 대안 기각 근거는 PLAN 참조.

- `POST /api/auth/consent` → `puzl_consent` 쿠키(JSON, 5분). 프로젝트 기존 쿠키 관례(`app/api/admin/login/route.ts`)와 동일하게 `httpOnly` / `secure`(prod) / `sameSite=lax` / 명시적 `path`·`maxAge`
- `app/auth/callback/route.ts` → 쿠키 판독·검증 → `profile_data.consent` 저장 → 쿠키 삭제

`sameSite`가 `lax`인 것이 이 설계의 급소다. 최종 착지(`supabase.co` → `/auth/callback`)가 **크로스사이트
top-level GET 내비게이션**이라 `strict`였으면 쿠키가 전송되지 않아 흐름이 **조용히** 깨진다(에러 없이 동의만 유실).

`public.users`는 타 puzl 제품과 공유하는 테이블이라 SQL 컬럼을 추가하지 않고 `profile_data` jsonb 안에만 저장했다.

### 신뢰 경계

동의값은 권한이 아니라 **사용자 자기신고**다. 위조해서 얻는 것이 "동의하지 않았는데 동의한 것으로 기록됨"뿐이고
이는 위조자 본인에게 불리하다. 따라서 HMAC 서명(프로젝트에 `jose`·`ADMIN_SESSION_SECRET`이 이미 있음)은
과설계로 판단해 채택하지 않았다. 대신 콜백이 쿠키를 무조건 신뢰하지 않고 엄격한 형태 검증을 거친다:
`typeof === 'boolean'` 강제(truthy 문자열 거부), `agreed_at` 유효 시각 확인, **필수 항목이 false인 페이로드는 폐기**.

공유 브라우저 승계 방지는 5분 TTL + **파싱 성공 여부와 무관하게 콜백의 모든 이탈 경로(성공/에러)에서 쿠키 삭제**로 처리한다.

## 검증 (실행 기반, 목킹 없음)

`npx tsc --noEmit` 통과. `npm run build` exit 0, `/legal/terms`·`/legal/privacy`는 정적(○) 프리렌더, `/api/auth/consent` 등록 확인.

### 페이지 (dev 서버 실 HTTP)

| 경로 | 결과 |
|---|---|
| `/login` | 200 |
| `/legal/terms` | 200 (비로그인 공개) |
| `/legal/privacy` | 200 (비로그인 공개) |
| `/` | 200 |
| `/onboarding`, `/hub` | 307 (기존 인증 게이트 정상 유지) |

`/login` 렌더 실측: 체크박스 `<input type="checkbox">` **4개**, id `consent-all`/`consent-terms`/`consent-privacy`/`consent-marketing`,
`/legal/terms`·`/legal/privacy` 링크 각 1개, 기존 더미 문구("에 동의합니다") **0건**.
랜딩 페이지 Footer에서 `href="/legal/terms"`, `href="/legal/privacy"` 각 1건 확인.

### 체크박스 인터랙션 (실제 컴포넌트 코드 구동)

프로젝트에 Playwright/Puppeteer가 없어 브라우저 클릭 대신, `typescript`로 `ConsentCheckboxes.tsx`를 트랜스파일해
**실제 컴포넌트 함수를 직접 호출**하고 반환된 엘리먼트 트리에서 `onChange` 핸들러를 발화시켜 검증했다.

| 시나리오 | 결과 |
|---|---|
| 자식 000 / 100 / 110 → 전체동의 checked | false / false / false |
| 자식 111 → 전체동의 checked | **true** |
| all-off + 전체동의 클릭 | terms=1 privacy=1 marketing=1 |
| all-on + 전체동의 클릭 | terms=0 privacy=0 marketing=0 |
| all-on에서 마케팅만 해제 | 110 → 전체동의 checked **false** (양방향 동기화 성립) |
| 이용약관/개인정보 개별 클릭 | 서로 간섭 없음 |

**FR-03 함정 검증**: `<a>`가 `<label htmlFor>` 안에 중첩되면 약관 링크 클릭이 체크박스까지 토글한다.
정규식으로 label이 `<a>`를 감싸는지 확인 → `false`(형제 관계). `target="_blank"` 2건, `rel="noopener noreferrer"` 2건.

**FR-04**: 초기 렌더(동의 0건) HTML에 카카오 버튼 `disabled=""` 존재, 안내 문구 "필수 항목에 동의하면…" 렌더.
`NEXT_PUBLIC_KAKAO_ENABLED=true`로 구동해 실제 게이팅 경로를 확인했다(플래그 false면 버튼 자체가 없어 검증 불가).
전체 변경 파일에 `alert(`/`confirm(` **0건**.

### 동의 API (프로덕션 빌드 서버, 실 HTTP)

정상 요청 응답 헤더 실측:

```
set-cookie: puzl_consent=%7B%22terms%22%3Atrue...%7D; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=lax
```

| 케이스 | 결과 |
|---|---|
| 정상 | 200 `{"ok":true}` + 위 쿠키 |
| `terms:false` (필수 미동의) | 400 `이용약관과 개인정보처리방침에는 동의해야 합니다.` |
| `"true"` 문자열 | 400 `동의 항목 형식이 올바르지 않습니다.` |
| 필드 누락 | 400 |
| 배열 페이로드 | 400 |
| `null` | 400 |
| 비-JSON 본문 | 400 (500 아님) |
| `GET` | 405 |

### 쿠키 왕복

서버가 실제로 발급한 `Set-Cookie` 값을 그대로 `parseConsentCookie`에 투입해 왕복을 증명했다.
URL 인코딩(`{`, `"`, `:`)을 거쳐도 `agreed_at`까지 원본과 일치.

적대적 입력 10종 전부 `null` 반환: `undefined` / 빈 문자열 / 비-JSON / 배열 / `null` / 문자열 boolean /
`terms:false` / `privacy:false` / 깨진 `agreed_at` / `agreed_at` 누락.

### 회귀·비침습 확인

- `git diff 9ae95f9..HEAD -- middleware.ts` → **0줄**. 이 저장소 최고 리스크 파일을 건드리지 않았다
- `git diff 9ae95f9..HEAD -- app/onboarding/page.tsx` → **0줄**. FR-10(온보딩 동의 UI 중복 금지) 충족
- 변경 파일 15개 전체에 `console.log` 0 / `any` 0 / `TODO` 0 / 보라-파랑 그라데이션 0 / `dark:` 0

## Match Rate

| 구분 | 충족 | 부분충족 | 미충족 |
|---|---|---|---|
| FR-01 ~ FR-10 | 10 | 0 | 0 |
| NFR-01 ~ NFR-05 | 5 | 0 | 0 |

**구현 일치율 15/15 = 100%**

다만 일치율과 검증 커버리지는 다르다. 실행으로 확인한 것은 15건 중 13건이고,
FR-08·FR-09(콜백의 실제 DB 쓰기)는 **코드 경로 검증까지만** 도달했다 — 아래 참조.

**실행 검증 커버리지 13/15 = 87%**

## 미검증 — 카카오 앱 등록 대기

`NEXT_PUBLIC_KAKAO_ENABLED=false`이고 Supabase에 Kakao provider가 없어(`authorize?provider=kakao` →
`400 Unsupported provider`) 실제 OAuth 왕복을 구동할 수 없다. 따라서 아래는 **실측되지 않았다**:

1. 카카오 화면을 실제로 거친 뒤 `puzl_consent` 쿠키가 최종 `/auth/callback` GET까지 살아서 도착하는지.
   `sameSite=lax`의 top-level 내비게이션 동작상 도착해야 하지만, **이 흐름의 유일한 실패 지점**이고 실측이 없다
2. `insertNewUser`가 신규 유저 `profile_data.consent`를 실제로 쓰는지 (DB 왕복)
3. `backfillExistingUser`가 재로그인 시 consent만 갱신하고 다른 키를 보존하는지 (DB 왕복)

1~3은 카카오 콘솔 + Supabase Provider 설정(`.planning/KAKAO_SETUP_GUIDE.md`) 완료 직후 **최초 1회 실제 가입으로
반드시 확인**해야 한다. 확인 지점: `public.users.profile_data.consent`에 `{terms,privacy,marketing,agreed_at}` 존재,
그리고 기존 유저 재로그인 후 `referral_code` 등 기존 키 보존.

## 남은 리스크

1. **약관 원문은 법무 검토 전 초안이다.** 페이지 상단에 명시했으나 실제 서비스 오픈 전 법무 검토 필수.
   회사 정보(사업자등록번호 등)는 `components/Footer.tsx`의 기존 값과 일치시켰는데, 그 값 자체가 실제인지는 확인하지 않았다
2. **다크모드 미대응(의도적).** 지시에 라이트/다크 대응이 있었으나 실측 결과 이 저장소에 다크모드가 존재하지 않는다
   (`dark:` 0건, `tailwind.config.ts`에 `darkMode` 미설정, `globals.css`에 `prefers-color-scheme` 없음).
   Tailwind 기본값이 `darkMode: 'media'`라 여기에만 `dark:`를 넣으면 OS 다크모드에서 **흰 카드 안 동의 영역만 어두워지는**
   깨진 화면이 된다. 대신 전부 토큰으로 표현해 향후 전역 도입 시 토큰 교체만으로 따라오게 했다
3. **동의 쿠키 미서명.** 위 "신뢰 경계"의 판단에 따른 의도적 선택. 동의를 부인권(non-repudiation) 증거로 써야 하는
   법적 요구가 생기면 서명 도입 필요
4. **`POST /api/auth/consent`는 비인증 공개 엔드포인트**이고 레이트리밋이 없다. 쿠키가 호출자 본인에게만 영향을 주고
   DB를 건드리지 않아 악용 가치가 낮다고 판단했으나, 무제한 호출 가능한 것은 사실이다
5. **Footer 법적고지 4개 링크는 여전히 죽어 있다**(위치기반서비스 약관, 마케팅 정보 수신, 청소년 보호정책, 환불 정책).
   해당 문서가 없어 이번 범위에서 제외했다
6. 마케팅 동의를 **실제로 발송 로직과 연결하지 않았다.** `profile_data.consent.marketing`은 기록만 되고,
   `lib/email.ts`의 발송 경로가 이 값을 확인하지 않는다. 마케팅 메일을 실제로 보내기 전에 반드시 연결해야 한다

## 범위 밖으로 판단해 남겨둔 것

`app/onboarding/page.tsx`에 커밋되지 않은 색상 토큰 교체(`#0066cc` → `primary`/`primary-dark`)가 있으나,
**이 세션 시작 시점의 git 스냅샷에 이미 존재**했고 `border-[#e0e0e0]`가 그대로 남은 미완성 상태다.
다른 세션의 진행 중 작업으로 판단해 건드리지 않았다.
