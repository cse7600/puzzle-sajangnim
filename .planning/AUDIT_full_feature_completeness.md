# 퍼즐 사장님 — 전체 탭 기능 완성도 감사

- 감사일: 2026-08-25
- 대상 브랜치: `fix/naver-place-apollo-state` (main 대비 4커밋 앞섬, 미머지)
- 방식: 전 UI/API 파일 정독(6개 조사 에이전트 병렬) + Supabase REST API로 실 DB 스키마 직접 검증
- 성격: 진단(Check) 전용. 코드 수정 없음.
- 종합 완성도: **약 38%**

---

## 0. 실 DB 검증 결과 (이번 감사의 핵심 발견)

`migrations/*.sql` 파일과 실제 Supabase(`nbfoifegbamvtwffbuxv`) 스키마를 service role key로 대조한 결과, **파일과 실 DB가 어긋난다.** 기존에 "001~005 적용 완료"로 알려진 전제가 부분적으로 틀렸다.

### 0.1 테이블 존재 여부 — 22개 전부 존재

`users, ad_accounts, receipts, team_deals, team_deal_members, points, paybacks, referrals, point_transactions, referral_earnings, daily_point_limits, puzl_community_posts, puzl_community_comments, puzl_banned_words, knowledge_questions, knowledge_answers, knowledge_daily_points, notifications, puzl_place_registrations, puzl_place_keywords, puzl_place_snapshots, puzl_keyword_rankings` — 전부 HTTP 200.

### 0.2 users 테이블 실 스키마가 `001_initial.sql`과 완전히 다름

실측 결과:

```
{"id","email","role","profile_data","created_at","updated_at"}
```

`migrations/001_initial.sql:5-17`이 정의한 `kakao_id, name, phone, business_name, business_type, total_points, referral_code, referred_by` 컬럼은 **8개 전부 존재하지 않는다**(`column users.name does not exist` 등 실측 확인).

실제 운영 데이터는 `profile_data` jsonb 안에 들어있다:

```json
{"id":"00000000-0000-0000-0000-000000000001","email":"demo@puzzle.kr","role":"advertiser",
 "profile_data":{"name":"김철수","total_points":23400,"business_name":"을지로 쌈밥 철수네","referral_code":"PUZZLE01"}}
```

즉 **`001_initial.sql`의 users 정의는 사문(死文)이며, 실제로는 다른 프로젝트와 공유하는 Supabase의 users 테이블을 쓰고 있다.** users에 29행이 있고 그중 `cse7600@gmail.com`처럼 이 서비스와 무관한 실 계정이 섞여 있다(`profile_data: {}`). `migrations/003_earnings_community_points.sql:120-122` 주석의 "공유 DB" 언급이 이를 시인한다.

파급: `types/database.ts:6-19`의 users 타입도 전부 stale이며, 이 때문에 API 라우트 대부분이 `supabaseAdmin as any`로 타입을 무력화하고 있다.

### 0.3 migration 002는 실제 DB에 미적용 — 확정

| 002가 추가하기로 한 것 | 실측 결과 |
|---|---|
| `users.business_number` | `column does not exist` |
| `users.business_certificate_url` | `column does not exist` |
| `users.onboarding_completed` | `column does not exist` |
| `ad_accounts.platform` CHECK 6종 확장 (002:49-55) | `platform='toss'` INSERT 시 `23514 ad_accounts_platform_check` 위반 |

002의 knowledge 계열 테이블은 `003_earnings_community_points.sql:87` 이하에서 재선언돼 살아남았으나, **users ALTER와 ad_accounts CHECK 확장은 유실됐다.** 이것이 settings 탭과 hub 탭이 구조적으로 동작하지 않는 근본 원인이다.

### 0.4 migration 004는 적용됨

`ad_accounts.status`에 `'approval_requested'` PATCH가 성공(실측 후 `'active'`로 원복 완료). `notifications` 테이블도 존재.

### 0.5 RLS 실측 — 절반의 테이블이 anon key로 열려 있음

`NEXT_PUBLIC_SUPABASE_ANON_KEY`(클라이언트 번들에 노출됨)로 직접 조회한 결과:

| 테이블 | anon 조회 | 상태 |
|---|---|---|
| `users` | `[]` | RLS on + 정책 없음 → 차단 |
| `receipts` | `[]` | RLS on + 정책 없음 → 차단 |
| `ad_accounts` | `[]` | RLS on + 정책 없음 → 차단 |
| `point_transactions` | **데이터 반환** | RLS 미적용 → 노출 |
| `knowledge_questions` | **데이터 반환** | RLS 미적용 → 노출 |
| `puzl_community_posts` | **데이터 반환** | RLS 미적용 → 노출 |

`migrations/001_initial.sql:114-119`가 RLS를 켠 테이블은 6개뿐이고, 003/004가 만든 12개 테이블에는 `enable row level security` 구문이 아예 없다(`migrations/003` 전체에 0건). RLS가 꺼진 테이블은 anon key로 읽기가 실측 확인됐으며, 같은 이유로 쓰기도 차단되지 않는다.

**가장 위험한 지점: `point_transactions`가 열려 있다.** 이 테이블은 포인트 원장이며, anon key는 브라우저 번들에서 누구나 추출할 수 있다.

---

## 1. 탭별 완성도 표

| 탭 | 운영 판정 | 완성도 | 핵심 이슈 | 다음 액션 |
|---|---|---|---|---|
| **place** | 운영 가능 | 85% | 네이버 실데이터 수집→저장 파이프라인 완성. 체크리스트/경쟁자만 목업. 소유자가 상수라 다중 사용자 불가 | Auth 연동, 스냅샷 크론 |
| **team-buy** | 부분 가능 | 55% | join이 `team_deal_members`에 insert 안 함 → 중복 참여 무제한. `route.ts:4` 잘못된 ID로 딜 생성 항상 실패 후 가짜 성공. 결제 없음 | DB 함수로 join 원자화, ID 수정, MOCK 폴백 제거 |
| **knowledge** | 부분 가능 | 55% | 답변 채택(adopt) API 자체가 없음 → 핵심 수익 루프 미완결. 리워드가 항상 0 | 채택 API 신설, 리워드 에스크로 |
| **community** | 부분 가능 | 50% | 댓글 API는 완성됐으나 UI에서 한 번도 호출 안 됨(사문). 상세 페이지·좋아요 없음 | 상세 페이지 + 댓글 UI 연결 |
| **earnings** | 부분 가능 | 50% | 읽기는 실연동. 원장 write가 knowledge/community 2곳뿐이라 영수증·추천·리워드 항목이 영구 0. 출금 신청 API 없음. `paybacks/route.ts:19`가 장애 시 가짜 금액 반환 | mock 폴백 제거, 적립 경로 연결, 출금 API |
| **referral** | 부분 가능 | 45% | 조회는 실연동이나 `referral_earnings` INSERT 코드가 0건. `/r/[code]` 라우트 부재로 추천 링크가 404. 가입 시 `referred_by` 세팅 없음 | 추천 링크 라우트, 코드 발급, 분배 트리거 |
| **rewards** | 목업 수준 | 40% | Claude OCR은 실작동. 그러나 이미지가 Storage에 안 올라감(가짜 URL 조립). 승인 API 없음. 승인 시 포인트 적립 없음 | Storage 업로드, PATCH API, awardPoints 연결 |
| **hub** | 목업 수준 | 30% | `route.ts:5`가 UUID 아닌 ID를 써서 GET/POST가 항상 실패 후 mock 반환. UI의 6개 채널 중 3개는 DB CHECK가 거부. 요율 UI/서버 불일치 | ID 수정, supabaseAdmin 전환, 002 재적용 |
| **experience** | 목업 수준 | 20% | API·DB 테이블 전무. 캠페인/크리에이터/품앗이 전부 하드코딩 배열 | 스키마 설계부터 |
| **admin** (6페이지) | 목업 수준 | 20% | users/points/receipts/team-deals 4개가 100% mock. 승인·거절이 로컬 state만 변경. **인증 게이트 전무** | 인증 게이트 최우선, 관리자 API 신설 |
| **settings** | 목업 수준 | 20% | 대상 컬럼 3개가 실 DB에 없음(002 미적용) → 저장이 구조적으로 불가. GET API 없어 프리필 불가. 응답 검사 없어 항상 성공 화면 | 006 마이그레이션 + GET/PATCH API |
| **ai-blog** | 목업 수준 | 15% | 생성 버튼에 onClick 자체가 없음. 블로그용 Claude 호출 코드 없음. DB 테이블 없음 | 스키마 + 생성 API |
| **dashboard** | 목업 수준 | 15% | mock 5종. 유저명·날짜("2026년 6월 18일")·상호명 하드코딩. 재사용 가능한 기존 API를 하나도 호출 안 함 | 기존 API 연결(저비용 고효과) |

---

## 2. 전 탭 공통 선결 과제

개별 탭 작업보다 먼저 해결해야 하는, 여러 탭에 동시에 걸린 문제들이다.

### C1. 인증이 존재하지 않는다 (최우선)

- `app/(auth)/login/page.tsx:22-35` — "카카오로 시작하기" onClick이 `router.push('/dashboard')` 한 줄. Supabase 호출 0건.
- `app/(auth)/signup/page.tsx:11` — `useState(2)`로 시작해 카카오 연동 단계를 건너뛴다. `:90-96` "완료하기"가 `setStep(3)`만 호출 → 입력한 상호명/업종/지역이 **어디에도 저장되지 않는다.**
- 코드베이스 전체에 `supabase.auth` / `signInWithOAuth` / `getSession` / `@supabase/ssr` 출현 **0건**.
- **`middleware.ts`가 존재하지 않는다.** 보호 라우트 없음 → 비로그인 상태로 모든 `(app)` 라우트 및 `/admin/*` 직접 접근 가능.
- `lib/auth.ts:25-27` — `isLoggedIn()`이 무조건 `true` 반환.
- `components/AppSidebar.tsx:102-107` — 로그아웃 버튼에 onClick 핸들러가 없다.

파급: place 탭조차 소유자가 상수라 다중 사용자 환경에서는 **모든 사장님이 같은 플레이스를 공유하게 된다.** 즉 "완성도 85%"인 place도 인증 없이는 출시 불가다.

### C2. DEMO_USER_ID가 3개 값으로 분열, 그중 2개는 UUID가 아님

| 값 | 위치 |
|---|---|
| `'00000000-0000-0000-0000-000000000001'` (정본, 실 DB에 존재) | `lib/auth.ts:5`, `app/api/team-deals/[id]/join/route.ts:5` |
| `'demo-user-001'` (**UUID 아님**) | `lib/hooks/useUser.ts:6`, `app/api/team-deals/route.ts:4`, `app/api/users/onboarding/route.ts:4`, `app/api/ad-accounts/route.ts:5`, `app/admin/ad-accounts/page.tsx:37` |
| `'demo'` | `app/admin/receipts/page.tsx:15-17` |

`users.id`는 uuid이므로 `'demo-user-001'`은 DB에 닿는 순간 `invalid input syntax for type uuid`로 실패한다. **hub, team-buy, settings 3개 탭이 이 한 줄 때문에 지금 동작하지 않는다.** 3개 파일 5줄 수정으로 즉시 해소되는 최고 ROI 항목이다.

### C3. 실패를 성공으로 위장하는 패턴이 전역에 퍼져 있음

catch 블록에서 mock 데이터나 `success: true`를 200으로 반환하는 코드가 최소 8곳:

- `app/api/receipts/route.ts:32` — 결과 0건이어도 MOCK 3건 반환. `:33-35`, `:78-84` catch도 동일
- `app/api/paybacks/route.ts:19,23-42` — 장애 시 `buildMockPaybacks()`로 **존재하지 않는 금액 19,000원**을 표시
- `app/api/ad-accounts/route.ts:37-53, 87-101` — GET/POST 전부 mock 폴백
- `app/api/ad-accounts/[id]/request-approval/route.ts:40-42` — 모든 예외에서 `{success: true}` + HTTP 200
- `app/api/team-deals/route.ts:113, 117-119, 141, 154-155` — 0건이어도 MOCK_DEALS 3건 반환
- `app/api/earnings/route.ts:141-142` — catch 시 조용히 0원 반환

파급: (a) 신규 사용자가 남의 영수증·딜을 자기 것으로 본다, (b) DB 장애가 "데이터 없음"으로 위장돼 탐지 불가, (c) 사장님과 관리자 양쪽이 "등록 완료"를 봤지만 DB에는 기록이 없어 **페이백 정산 분쟁으로 직결**된다.

### C4. 포인트 원장 write 경로가 2개뿐

`lib/points.ts:52-62`의 `awardPoints()`는 제대로 구현돼 있으나, 호출처가 전수 검색 결과 4곳(knowledge 2 + community 2)뿐이다.

`type`에 정의된 `receipt`, `referral`, `reward`, `redeem` 4종을 쓰는 코드가 **0건**이다. 결과:

- `/api/earnings?tab=rewards`는 구조적으로 항상 빈 배열
- `points/summary`의 영수증/추천인/이벤트/차감 4개 그룹이 항상 0이라 화면에서 제거됨
- `app/(app)/rewards/page.tsx:131`이 보유 포인트를 `23400 + totalPoints`로 하드코딩

추가로 `awardPoints`는 read→계산→insert가 트랜잭션이 아니라, 동시 요청 시 일일 한도 60,000P(`lib/points.ts:10`)를 초과 지급할 수 있다.

### C5. 승인 흐름이 전 도메인에서 미완결

영수증·팀딜·광고계정 어느 것도 "승인" 상태로 전이시키는 API가 없다. `app/api/` 21개 라우트 중 관리자 전용 라우트가 0개다. admin 페이지의 승인 버튼은 전부 `setState`만 호출해 새로고침하면 원복된다.

### C6. 마이그레이션 파일이 실 DB의 진실이 아님

0장 참조. 002 미적용, 001의 users 정의 사문화, 유령 테이블 2개(`points`, `referrals` — 참조 코드 0건, 후속 마이그레이션이 대체). 현재 상태에서는 **마이그레이션 파일만으로 DB 재구축이 불가능하다.**

---

## 3. 우선순위 로드맵

"실제 사장님이 써도 되는 서비스"까지 가장 빠른 경로. 아래 순서는 의존성 기준이다.

### Sprint 0 — 즉시 (0.5일, 5줄 수정)

C2의 UUID 버그만 고친다. 코드 5줄로 hub·team-buy·settings 3개 탭의 "무조건 실패" 상태가 해소된다.

1. `app/api/team-deals/route.ts:4`, `app/api/ad-accounts/route.ts:5`, `app/api/users/onboarding/route.ts:4` → `lib/auth.ts`의 `DEMO_USER_ID` import로 교체
2. 위 3개 라우트의 anon `supabase` → `supabaseAdmin` 교체 (RLS 차단 해소)
3. `lib/hooks/useUser.ts:6` 값 통일 (또는 미사용 파일이므로 삭제)

### Sprint 1 — 데이터 신뢰성 회복 (2일)

돈이 걸린 화면이 거짓말을 하지 않게 만든다. 인증보다 먼저 하는 이유는, 인증을 붙여도 이 폴백들이 남아 있으면 신규 유저가 남의 데이터를 보게 되기 때문이다.

4. C3의 mock 폴백 8곳 전량 제거 → 빈 배열 또는 5xx 반환
5. 각 탭 UI에 에러 상태 추가 (현재 12개 탭 중 에러 UI가 있는 곳은 community 작성 모달과 rewards 분석 모달 2곳뿐)
6. `app/api/paybacks/route.ts` mock은 최우선 — 금액 오표시 리스크
7. `app/api/earnings/route.ts:39` — `confirmed` 상태 페이백이 예상/확정 어느 탭에도 안 나와 총액에서 누락되는 버그 수정

### Sprint 2 — 인증 (3~4일, 나머지 전부의 선결 조건)

8. `@supabase/ssr` 추가 → `lib/supabase-browser.ts` / `lib/supabase-server.ts` 분리
9. `middleware.ts` 신규 생성 — `(app)` 전 라우트 + `/admin/*` 보호
10. 카카오 OAuth 연결 (`login/page.tsx:23`) + `app/(auth)/callback/route.ts` 신설
11. `signup/page.tsx:11,91` — Step 1 복원, 폼 데이터를 실제로 저장
12. service role 라우트 16개에 세션 가드 삽입, `DEMO_USER_ID` → `session.user.id`
13. `app/admin/layout.tsx`에 `role === 'admin'` 게이트 (실 DB의 `users.role` 컬럼 사용 가능 — 현재 데모 유저는 `'advertiser'`)
14. `AppSidebar.tsx:102-107` 로그아웃 핸들러

### Sprint 3 — 스키마 정합화 (1일, Sprint 2와 병렬 가능)

15. `migrations/006_schema_reconciliation.sql` — 002 유실분 재적용(`users` 3개 컬럼, `ad_accounts.platform` CHECK 6종 확장)
16. `migrations/007_rls_policies.sql` — RLS 미적용 12개 테이블에 RLS + `auth.uid()` 기반 정책. **`point_transactions` anon 쓰기 차단 최우선**. `for select using (true)` 6개 정책도 소유자 기준으로 축소
17. `types/database.ts` 실 스키마 기준 재생성 → API 라우트 전반의 `as any` 제거 (현재 최소 12개 파일)
18. 유령 테이블 `points`, `referrals` 정리

### Sprint 4 — 수익 루프 완결 (4~5일)

여기까지 오면 "돈이 도는" 서비스가 된다.

19. 영수증: Storage 실업로드 + `PATCH /api/receipts/[id]` + 승인 시 `awardPoints({type:'receipt'})`. 상태 전이 가드로 중복 적립 차단
20. 지식거래소: 답변 채택 API + 리워드 에스크로 (질문 등록 시 차감 → 채택 시 이관)
21. 추천인: `/r/[code]` 라운딩 라우트, 가입 시 `referred_by` 세팅, `referral_earnings` INSERT 트리거
22. 팀구매: `team_deal_members` insert + Postgres 함수로 join 원자화(현재 중복 참여 무제한 + lost update)
23. 출금: `POST/PATCH /api/paybacks` + 상태 전환
24. `awardPoints`를 Postgres 함수로 이관 (동시성 한도 우회 차단)

### Sprint 5 — 관리자 백오피스 (3일)

25. `app/api/admin/*` 관리자 전용 라우트 신설 (전부 `supabaseAdmin` + role 검증)
26. admin 6개 페이지의 mock 배열 제거 → 실 API 연동. 승인/거절을 실제 mutation으로
27. 광고계정 승인 화면 — 현재 `approval_requested` → `active` 전이 경로가 UI에 없어 플로우가 끊긴다

### Sprint 6 — 저비용 고효과 (1일)

28. dashboard의 mock 5종을 **이미 존재하는** `/api/points/summary`, `/api/earnings`, `/api/team-deals`, `/api/place/rankings`로 교체. 신규 개발 없이 첫 화면 신뢰도가 크게 오른다
29. `dashboard/page.tsx:125,127,315` — 유저명/날짜/상호명 하드코딩 제거 (현재 화면에 2개월 전 날짜가 표시됨)
30. community 상세 페이지 + 댓글 UI 연결 (`comments/route.ts`는 이미 완성돼 있으나 호출처가 없는 사문 상태)

### Sprint 7 — 신규 도메인 (별도 페이즈)

31. experience: `puzl_campaigns` / `puzl_campaign_applicants` / `puzl_creators` / `puzl_exchanges` 스키마 설계부터
32. ai-blog: `puzl_blog_posts` 스키마 + `lib/claude.ts`에 `generateBlogPost()` + 스트리밍 생성 API. 네이버 블로그 발행 연동은 다시 별도

---

## 4. 보안 이슈 요약

| ID | 심각도 | 내용 | 위치 |
|---|---|---|---|
| S1 | 높음 | `/admin/*` 6개 페이지에 인증·권한 게이트 전무. URL만 알면 누구나 사업장명·계정ID·광고예산·페이백율 열람 및 승인 버튼 조작 | `app/admin/layout.tsx` 전체, `middleware.ts` 부재 |
| S2 | 높음 | `point_transactions`(포인트 원장)가 RLS 미적용 상태로 anon key에 노출. anon key는 클라이언트 번들에 포함 | 실측 확인, `migrations/003:6` |
| S3 | 높음 | service role 라우트 16개에 인증 검사 0줄. curl로 직접 호출 시 DEMO_USER 명의 쓰기 가능. `lib/points.ts`도 service role이라 포인트 임의 발행 경로 | `app/api/**` 16개 파일 |
| S4 | 중간 | 관리자 페이지가 브라우저에서 anon 키로 `ad_accounts.update()` 직접 호출. 현재는 RLS 정책 부재 덕에 우연히 막혀 있으나, "화면이 안 보인다"고 `using(true)` 정책을 추가하는 순간 익명 조작 가능 | `app/admin/ad-accounts/page.tsx:3,98` |
| S5 | 중간 | `notifications` RLS 미적용 + anon 클라이언트 insert. 임의 user_id에 임의 알림 주입 가능 → 알림 UI 붙는 순간 피싱 벡터 | `migrations/004:11-20`, `app/api/ad-accounts/[id]/request-approval/route.ts:30` |
| S6 | 중간 | `team-buy/[id]/page.tsx:167`이 `dangerouslySetInnerHTML`로 `content_html` 렌더. 어드민 textarea가 DB에 연결되는 순간 저장형 XSS. (해당 컬럼은 현재 실 DB에 없음) | `app/(app)/team-buy/[id]/page.tsx:164-168` |
| S7 | 낮음 | Claude API 원문 에러 본문이 클라이언트 JSON에 노출 | `lib/claude.ts:71` → `app/api/receipts/analyze/route.ts:25` |

긍정 요소: `.env.local`은 `.gitignore`에 걸려 있고 `git ls-files`에 env 파일 없음 — 커밋 이력 키 유출은 없다.

---

## 5. 코드 품질 부채

- **`as any` 광범위 사용** — 최소 12개 라우트(`receipts`, `knowledge` 3, `community` 2, `earnings`, `points/summary`, `paybacks`, `referral` 2, `place/register`, `lib/points.ts`). 원인은 `types/database.ts`가 실 스키마와 어긋난 것. 컬럼 오타가 런타임까지 통과한다. (전역 CLAUDE.md의 `any` 금지 규칙 위반)
- **중복 구현** — `app/(app)/community/page.tsx` 전체와 `app/(app)/knowledge/page.tsx:397-537`이 거의 동일 코드. 카테고리 상수도 이중 정의. 두 진입점이 모두 라이브
- **금지어 필터 중복** — `posts/route.ts:18-29`는 5분 TTL 캐시, `comments/route.ts:11-15`는 매 요청 전체 테이블 조회
- **사장 코드** — `components/modals/TeamBuyModals.tsx`(import 0건), `lib/hooks/useUser.ts`(참조 0건), `app/api/community/comments/route.ts`(완성됐으나 호출처 0건)
- **빈 catch** — `app/admin/ad-accounts/page.tsx:89,99-101`, `app/(app)/hub/page.tsx:66` 등. 운영 중 장애 탐지 불가

---

## 6. 배포 상태

Vercel 프로덕션(`puzzle-sajangnim.vercel.app`)은 68일 전 배포로, 현 브랜치의 4커밋(플레이스 실데이터 연동 포함)이 반영돼 있지 않다. 현재 브랜치는 main에 미머지 상태다.

---

## 7. 한 줄 결론

기능 셸은 12개 탭 전부 갖춰졌고 place 하나는 실제로 작동한다. 그러나 **인증이 존재하지 않고**, 실패를 성공으로 위장하는 폴백이 금전 화면까지 퍼져 있으며, 포인트 원장에 쓰는 경로가 2개뿐이라 수익 루프가 어디서도 닫히지 않는다. Sprint 0(5줄)과 Sprint 1(폴백 제거)만으로도 체감 신뢰도가 크게 오르지만, 실사용자 대상 출시는 Sprint 2(인증) 완료가 최소 조건이다.
