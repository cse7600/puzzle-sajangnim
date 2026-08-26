# 카카오 로그인 연동 가이드

카카오 개발자 앱을 만들고 Supabase Auth에 연결해서 실제로 로그인이 되게 만드는 절차다.
현재 코드는 다 준비돼 있고, `NEXT_PUBLIC_KAKAO_ENABLED=false`로 꺼져 있는 상태다.
이 문서대로 하면 마지막에 이 값을 `true`로 바꿔서 로그인 버튼을 켤 수 있다.

작업은 **카카오 개발자 콘솔 → Supabase 대시보드 → 이 저장소 환경변수** 순서로 진행한다.
소요 시간은 이메일 동의항목을 어떻게 처리하느냐에 따라 다르다(즉시 완료 가능 ~ 카카오 심사 대기 며칠).

---

## 0. 끝나면 손에 쥐고 있어야 할 것 (체크리스트)

- [ ] 카카오 앱 REST API 키 (`<카카오_REST_API_키>`)
- [ ] 카카오 로그인 Client Secret 코드 (`<카카오_Client_Secret>`) — 활성화 상태 "사용함"
- [ ] Redirect URI에 `https://nbfoifegbamvtwffbuxv.supabase.co/auth/v1/callback` 등록 완료
- [ ] Web 플랫폼에 `http://localhost:3000`, `https://puzzle-sajangnim.vercel.app` 도메인 등록 완료
- [ ] 동의항목: 닉네임(profile_nickname) 설정 완료, 이메일(account_email) 설정(어느 단계든) 완료
- [ ] Supabase 대시보드에 REST API 키 → Client ID, Client Secret 코드 → Client Secret 입력 완료
- [ ] Supabase URL Configuration에 로컬/프로덕션 리다이렉트 URL 등록 완료
- [ ] 이 저장소 `.env.local`과 Vercel 프로젝트 설정에 `NEXT_PUBLIC_KAKAO_ENABLED=true` 반영 완료

---

## 중요한 구분: URL이 3개 나온다

헷갈리기 가장 쉬운 부분이라 먼저 정리한다.

| URL | 어디에 등록하나 | 값 |
|---|---|---|
| ① 카카오 로그인 Redirect URI | **카카오 개발자 콘솔** | `https://nbfoifegbamvtwffbuxv.supabase.co/auth/v1/callback` (고정, Supabase 프로젝트 콜백) |
| ② Supabase Redirect URLs (허용 목록) | **Supabase 대시보드** > Authentication > URL Configuration | `http://localhost:3000/**`, `https://puzzle-sajangnim.vercel.app/**` |
| ③ 앱 자체 콜백 라우트 | 코드에 이미 있음 (수정 불필요) | `/auth/callback` — 로그인 버튼이 `redirectTo`로 자동 전달함 |

즉 **카카오는 Supabase의 콜백 주소만 알면 되고**, Supabase가 그 뒤에 우리 앱의 `/auth/callback`으로 다시 보내주는 구조다. 카카오 콘솔에 `localhost`나 `vercel.app` 주소를 직접 넣는 게 아니다.

---

## Phase 1. 카카오 앱 만들기

1. https://developers.kakao.com 접속 → 로그인 → 상단 **[내 애플리케이션]** 클릭.
2. **[애플리케이션 추가하기]** 클릭.
3. 앱 아이콘(선택), 앱 이름(예: `퍼즐 사장님`), 사업자명(개인 개발자면 본인 이름 또는 서비스명) 입력 후 저장.
4. 생성된 앱 카드를 클릭해서 앱 관리 페이지로 들어간다. 이후 모든 설정은 이 앱 안에서 진행한다.

---

## Phase 2. Web 플랫폼 도메인 등록

카카오 로그인이 실제로 어느 도메인에서 호출되는지 카카오에 알려주는 단계. Redirect URI 등록과는 별개다.

1. 좌측 메뉴 **[앱 설정] > [앱] > [일반]**로 이동.
2. **플랫폼** 항목에서 **Web 플랫폼 등록** 클릭.
3. **사이트 도메인**에 다음 두 개를 각각 등록 (여러 개면 줄바꿈으로 구분):
   - `http://localhost:3000`
   - `https://puzzle-sajangnim.vercel.app`
4. 저장.

> 등록하지 않은 도메인에서 로그인을 시도하면 카카오 쪽에서 막는다. 로컬 테스트를 하려면 `localhost:3000`도 반드시 넣어야 한다.

---

## Phase 3. 카카오 로그인 활성화

1. 좌측 메뉴 **[제품 설정] > [카카오 로그인] > [일반]**로 이동.
2. **활성화 설정**의 **상태**를 **ON**으로 변경.
   (OFF 상태로 로그인 시도하면 `KOE004` 에러가 난다.)
3. 같은 화면에서 **OpenID Connect**는 켜지 않아도 된다 (이 프로젝트는 사용 안 함).

---

## Phase 4. Redirect URI 등록

카카오 콘솔 UI가 최근 자주 바뀌고 있어서(2026년 상반기 기준 데브톡에 위치를 못 찾는다는 문의가 다수 있음), 아래 경로에 없으면 검색창에 "Redirect"로 찾거나 [카카오 로그인] 하위 메뉴를 전부 훑어봐야 할 수 있다.

1. 기본 경로: **[앱 설정] > [앱] > [플랫폼]**에서 등록한 **REST API 키**를 클릭 → **Redirect URI** 입력란.
   또는 **[제품 설정] > [카카오 로그인] > [일반]** 화면 안에 Redirect URI 섹션이 있을 수 있다.
2. Redirect URI에 정확히 아래 값을 입력:
   ```
   https://nbfoifegbamvtwffbuxv.supabase.co/auth/v1/callback
   ```
3. 저장.

> 이 값은 이 프로젝트의 Supabase 콜백 주소로 고정이다. `http://localhost:3000/auth/callback`을 여기 넣는 실수를 하지 말 것 — 그건 Supabase 쪽(Phase 7)에 등록하는 값이다.

---

## Phase 5. 동의항목 설정 (닉네임 + 이메일)

1. **[제품 설정] > [카카오 로그인] > [동의항목]**으로 이동.
2. **닉네임 (profile_nickname)**: 목록에서 [설정] 클릭 → **필수 동의**로 설정. 별도 심사 없이 바로 사용 가능.
3. **카카오계정(이메일) (account_email)**: 아래 갈림길을 먼저 읽고 선택.

### 이메일 동의항목 갈림길 — 반드시 읽을 것

카카오계정 이메일(`account_email`) 동의항목은 **비즈 앱으로 전환한 앱에서만** 신청/사용할 수 있다. 일반 앱 상태에서는 동의항목 목록에 아예 뜨지 않거나 신청이 막혀 있다.

**비즈 앱 전환에 사업자등록번호가 꼭 필요한 건 아니다.** 두 가지 경로가 있다.

- **경로 A — 사업자등록번호가 있는 경우**: [앱] > [일반] > [비즈니스 정보]에서 사업자 인증을 하면 바로 비즈 앱으로 전환된다.
- **경로 B — 사업자등록번호가 없는 개인 개발자인 경우**: [앱] > [일반] > [비즈니스 정보] > **개인 개발자 비즈 앱** 메뉴에서 본인인증 + 카카오비즈니스 통합 서비스 약관 동의로 전환 신청. 카카오 쪽 심사(승인)가 필요해서 즉시 반영되지 않을 수 있다.

비즈 앱 전환 후에도 이메일 동의항목은 **필수 동의 / 선택 동의 / 이용 중 동의** 중 하나를 고를 수 있다. 필수 동의는 별도 검수가 더 걸릴 수 있어, 빠르게 붙이고 싶다면 **선택 동의**나 **이용 중 동의**로 시작하는 걸 권장한다.

**비즈 앱 전환을 당장 안 하면 어떻게 되나** (이 저장소 코드 기준):
- 로그인 자체는 막히지 않는다. `app/auth/callback/route.ts`가 이메일이 없으면 `kakao_<카카오ID>@no-email.puzl.local` 형태의 더미 이메일을 만들어 계정을 생성한다.
- 다만 이 더미 이메일로는 환영 메일이 발송되지 않고(코드에서 의도적으로 스킵), 사용자가 온보딩 단계에서 실제 이메일을 직접 입력해야 한다.
- 즉 **비즈 앱 전환은 이메일을 빨리, 자동으로 받고 싶을 때만 급한 일**이지, 로그인 기능 자체를 막는 조건은 아니다. 먼저 선택 동의 없이 닉네임만으로 론칭하고 비즈 앱 전환은 병행해도 된다.

동의항목 설정 후 반드시 **저장**.

---

## Phase 6. REST API 키 확인 + Client Secret 발급

1. **[앱 설정] > [앱] > [일반]** (또는 [플랫폼] 화면)에서 **REST API 키**를 확인하고 복사해둔다. 이게 Supabase에 넣을 **Client ID**다.
2. **[제품 설정] > [카카오 로그인] > [보안]**으로 이동.
3. **Client Secret** 섹션에서 **코드 생성** 클릭 → 코드가 생성되면 복사해둔다.
4. 바로 아래 **활성화 상태**를 확인한다. 기본값이 **사용 안 함**이므로 반드시 **사용함**으로 바꿔야 한다. 이 토글을 빼먹으면 Supabase 쪽에서 Client Secret을 보내도 카카오가 거부한다.
5. 저장.

> 카카오싱크(비즈니스 채널 자동 연결 로그인)를 쓰는 경우엔 Client Secret이 지원되지 않는다는 카카오 안내가 있다. 이 프로젝트는 카카오싱크가 아니라 일반 카카오 로그인이므로 Client Secret을 정상적으로 사용하면 된다.

---

## Phase 7. Supabase 대시보드 설정

여기서부터는 https://supabase.com/dashboard 의 `nbfoifegbamvtwffbuxv` 프로젝트에서 진행한다.

### 7-1. Kakao Provider 활성화

1. 좌측 메뉴 **Authentication** > **Providers** (또는 **Sign In / Providers**).
2. 목록에서 **Kakao** 항목을 펼친다.
3. **Enable Sign in with Kakao**(또는 Kakao Enabled) 토글을 ON.
4. **Client ID** 칸에 Phase 6에서 복사한 **REST API 키** 입력.
5. **Client Secret** 칸에 Phase 6에서 복사한 **Client Secret 코드** 입력. (REST API 키와 Client Secret을 서로 바꿔 넣는 실수가 잦으니 라벨을 확인할 것.)
6. Phase 5에서 이메일 동의항목을 아직 안 붙였다면(선택 동의 안 함/비즈 앱 전환 전이라면), **Allow users without an email** 옵션을 켠다. 이걸 꺼둔 채로 이메일 없이 로그인하는 유저가 오면 로그인이 실패한다.
7. **Save**.

이 화면에 표시되는 Callback URL이 Phase 4에서 카카오 콘솔에 등록한 값(`https://nbfoifegbamvtwffbuxv.supabase.co/auth/v1/callback`)과 일치하는지 다시 한번 확인한다.

### 7-2. URL Configuration (리다이렉트 허용 목록)

1. **Authentication** > **URL Configuration**으로 이동.
2. **Site URL**을 프로덕션 주소로 설정: `https://puzzle-sajangnim.vercel.app`
3. **Redirect URLs**(허용 목록)에 아래 두 개를 추가:
   ```
   http://localhost:3000/**
   https://puzzle-sajangnim.vercel.app/**
   ```
4. 저장.

이 목록에 없는 주소로 `redirectTo`를 보내면 Supabase가 로그인 완료 후 리다이렉트를 거부한다. 로그인 버튼 코드(`components/auth/KakaoLoginButton.tsx`)는 `redirectTo`로 `{origin}/auth/callback`을 보내므로, 위 와일드카드 두 개면 로컬/프로덕션 모두 커버된다.

---

## Phase 8. 이 저장소 환경변수 반영

**REST API 키와 Client Secret은 이 저장소 어디에도 넣지 않는다.** Supabase 대시보드에만 존재한다. 이 저장소에서 건드릴 값은 딱 하나, 기능 스위치다.

### 로컬 (`.env.local`)

```
NEXT_PUBLIC_KAKAO_ENABLED=true
```

파일 위치: `/Users/hokang2father/puzzle-sajangnim/.env.local` (이미 존재, `false`로 되어 있는 줄을 찾아 수정).

### 프로덕션 (Vercel)

1. Vercel 대시보드 → `puzzle-sajangnim` 프로젝트 → **Settings** > **Environment Variables**.
2. `NEXT_PUBLIC_KAKAO_ENABLED` 값을 `true`로 설정 (Production 환경에 적용).
3. 재배포(다음 배포 때 자동 반영되거나, 즉시 반영하려면 Redeploy).

---

## 확인 방법

### 로컬에서 확인

1. `.env.local`에서 `NEXT_PUBLIC_KAKAO_ENABLED=true`로 바꾼 뒤 개발 서버 재시작 (`npm run dev` 등, env 변경은 재시작 필요).
2. `http://localhost:3000/login` 접속 → "카카오로 시작하기" 버튼이 보이는지 확인.
3. 버튼 클릭 → 카카오 로그인 화면으로 이동 → 카카오 계정으로 로그인 및 동의 → 자동으로 `http://localhost:3000/auth/callback`을 거쳐 리다이렉트.
4. 정상 흐름: **로그인 → (신규 유저면) `/onboarding` → 사업자 인증 단계 → 완료 후 `/hub`**. 기존 유저는 온보딩을 건너뛰고 바로 `/hub`로 간다.
5. Supabase 대시보드 **Authentication > Users**에서 방금 로그인한 유저가 생성됐는지 확인. `profile_data`에 `kakao_id`, `name`, `avatar_url`이 채워졌는지는 `public.users` 테이블에서 확인 가능.

### 프로덕션에서 확인

1. Vercel에 `NEXT_PUBLIC_KAKAO_ENABLED=true` 반영 후 재배포 완료 대기.
2. `https://puzzle-sajangnim.vercel.app/login` 접속 → 동일하게 로그인 → 온보딩/사업자 인증 → 허브 도달까지 끝까지 눌러본다.
3. 로컬 테스트 때 만든 계정과 별개로, 실제 카카오 계정(가능하면 테스트용 별도 계정)으로 한 번 더 시도해서 신규 가입 플로우가 깨지지 않았는지 확인.

---

## 자주 막히는 지점

### `redirect_uri_mismatch` / `KOE006`
카카오 콘솔에 등록한 Redirect URI(Phase 4)와 Supabase가 실제로 보내는 콜백 주소가 정확히 일치하지 않을 때 난다.
- `https://nbfoifegbamvtwffbuxv.supabase.co/auth/v1/callback`을 한 글자도 틀리지 않게 등록했는지 확인 (끝에 슬래시 유무, `http`/`https` 등).
- Redirect URI를 REST API 키 화면에 등록했는데 실제로는 다른 REST API 키를 Supabase에 넣었을 가능성도 확인 (앱에 REST API 키가 여러 개면 헷갈리기 쉬움).

### 이메일이 안 넘어오는 경우
- 비즈 앱 전환 전이거나, 이메일 동의항목을 아직 신청 못 한 상태면 카카오가 `account_email`을 아예 안 준다. 이건 정상 동작이다.
- Supabase Kakao Provider에서 **Allow users without an email**이 꺼져 있으면 이 경우 로그인 자체가 실패한다 — 반드시 켜져 있어야 한다(Phase 7-1).
- 앱 코드는 이메일이 없으면 더미 이메일로 계정을 만들고 온보딩에서 실제 이메일을 받으므로, 로그인 실패가 아니라 "환영 메일이 안 온다" 정도의 증상이면 정상이다.

### 로그인 후 무한 리다이렉트 / 콜백에서 계속 `/login?error=...`로 돌아오는 경우
- Supabase URL Configuration의 **Redirect URLs**(Phase 7-2)에 `http://localhost:3000/**` 또는 프로덕션 도메인이 빠져 있으면 `exchangeCodeForSession`이 실패해서 `/login?error=...`로 튕긴다.
- Client Secret 활성화 상태가 "사용 안 함"으로 남아 있으면 토큰 교환 자체가 카카오 쪽에서 거부된다 (Phase 6-4 다시 확인).
- 카카오 로그인 자체가 아직 "일반" 화면에서 상태 OFF로 남아 있으면 `KOE004`로 아예 로그인 화면 진입 전에 막힌다.

### `NEXT_PUBLIC_KAKAO_ENABLED`를 안 바꾼 경우
- 로컬에서만 `.env.local`을 고치고 Vercel 환경변수는 그대로 `false`로 둔 경우, 로컬에서는 되는데 프로덕션에서는 로그인 버튼 자체가 안 보인다(또는 코드에서 조건부 렌더링을 하고 있다면). 두 군데 다 바꿔야 한다.
- 반대로 Vercel만 바꾸고 로컬 `.env.local`을 안 바꾸면 로컬 개발 중에 계속 버튼이 안 보여서 "안 되는 줄" 착각하기 쉽다.
- env 값을 바꾼 뒤에는 로컬은 dev 서버 재시작, Vercel은 재배포가 필요하다 (Next.js가 빌드/시작 시점에 `NEXT_PUBLIC_*` 값을 번들에 굽기 때문).

---

## 참고한 공식 문서

- [Supabase: Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [카카오 디벨로퍼스: 카카오 로그인 > 설정하기](https://developers.kakao.com/docs/latest/ko/kakaologin/prerequisite)
- [카카오 디벨로퍼스: 카카오 로그인 > 이해하기](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [카카오 디벨로퍼스: 앱 설정 > 앱](https://developers.kakao.com/docs/latest/ko/app-setting/app)

**확인 못 한 부분**: 카카오 개발자 콘솔의 Redirect URI 입력란 정확한 메뉴 위치는 2026년 상반기 기준으로 UI가 유동적이라(카카오 데브톡에 다수 문의 발생 중) 공식 문서와 실제 화면이 다를 수 있다. Phase 4에 적어둔 경로에 없으면 콘솔 내 검색 기능으로 "Redirect"를 찾거나 [카카오 로그인] 하위 메뉴(일반/보안/고급)를 전부 확인할 것.
