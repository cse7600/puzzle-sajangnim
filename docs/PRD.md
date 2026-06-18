# 퍼즐 사장님 PRD (Product Requirements Document)

**최종 업데이트**: 2026-06-19  
**버전**: v0.2.0 (MVP 기능 구현 완료)  
**스택**: Next.js 14, TypeScript, Tailwind CSS, Supabase

---

## 제품 개요

소상공인(SMB) 마케팅 슈퍼앱. 마케팅 대행사 없이 사장님이 직접 할 수 있는 도구를 무료로 제공하고, 광고비 페이백·영수증 리워드·팀구매로 수익을 환원.

**핵심 가치**: 네이버 권한 하나 → 모든 마케팅 무료

---

## 현재 구현 상태 (v0.2.0)

### 완료된 기능

#### 1. Supabase 연결
- `lib/supabase.ts` — 클라이언트 싱글턴
- `lib/supabase-admin.ts` — 서버 전용 (service role)
- `types/database.ts` — 8개 테이블 완전 타입 정의
- `migrations/001_initial.sql` — 전체 스키마 + RLS + Realtime
- `.env.local` — perma-studio 프로젝트 연결

#### 2. 인증 UI (카카오 로그인)
- `/login` — 카카오 로그인 버튼 (실제 OAuth 미연결, 클릭 시 /dashboard)
- `/signup` — 2단계 회원가입 (카카오 완료 → 사업장 정보 → 완료)
- `lib/auth.ts` — 더미 세션 (DEMO_USER, 카카오 연동 후 교체 예정)
- **미완**: 실제 카카오 OAuth, Supabase Auth 세션 관리

#### 3. 광고계정 + 페이백 (`/hub`)
- 광고계정 등록 모달 (네이버/메타/구글/카카오)
- 플랫폼별 페이백 요율: 네이버 5%, 카카오 4.5%, 메타 4%, 구글 3.5%
- 페이백 내역 탭 분리
- `/api/ad-accounts` GET/POST, `/api/paybacks` GET
- **미완**: 실제 광고계정 API 검증, 월별 집계, 정산 플로우

#### 4. 영수증 리워드 (`/rewards`)
- 영수증 업로드 모달 (사진 + 가게명 + 금액)
- 금액별 포인트 자동 계산: ~1만원 50P / 1~3만원 100P / 3~10만원 200P / 10만원+ 500P
- `/api/receipts` GET/POST, Supabase Storage 연동 준비
- **미완**: OCR 자동 인식, 실제 이미지 업로드 (Supabase Storage), 포인트 실사용

#### 5. 팀구매 (`/team-buy`) — 올웨이즈 패턴
- 딜 생성 모달 (방장가/팀원가 분리, 카테고리, 목표인원, 마감시간)
- 실시간 카운트다운 타이머 (hydration 안전)
- 딜 참여 → current_count 업데이트 → 달성 시 completed
- `/api/team-deals` GET/POST, `/api/team-deals/[id]/join` POST
- **미완**: 카카오 공유 딥링크, 결제 PG 연동, 자동 마감 (pg_cron), 환불 처리

#### 6. 어드민 (`/admin`)
- 비밀번호 없음 (추후 추가 예정)
- 대시보드: 사용자/광고계정/영수증/팀딜 통계
- 영수증 검토: 승인/거절 처리
- 광고계정 관리: 상태 변경
- 팀딜/사용자/포인트 목록
- **미완**: 어드민 인증, 실제 DB 액션 반영, 포인트 수동 지급

### 기존 UI 페이지 (목 데이터)
- `/dashboard` — 통계 카드, 블로그 현황, 팀구매 현황
- `/place` — 네이버 플레이스 순위 진단 (순위 업데이트 버튼 인터랙션)
- `/experience` — 미니 체험단 신청 (신청 완료 모달)
- `/ai-blog` — AI 블로그 자동화 UI
- `/referral` — 추천인 시스템 UI
- `/knowledge` — 지식 거래소 UI

---

## DB 스키마 (migrations/001_initial.sql)

| 테이블 | 용도 |
|--------|------|
| users | 사용자 (kakao_id, 사업장 정보, 포인트, 추천코드) |
| ad_accounts | 광고계정 (플랫폼, 계정ID, 월예산, 페이백율, 상태) |
| paybacks | 페이백 내역 (월별, 금액, 상태) |
| receipts | 영수증 (이미지URL, 가게명, 금액, 포인트, OCR) |
| team_deals | 팀구매 딜 (방장가/팀원가 분리, 카운트, 마감) |
| team_deal_members | 딜 참여자 (리더여부, 결제금액) |
| points | 포인트 원장 (출처 타입별) |
| referrals | 추천인 관계 (5% 수수료) |

---

## 다음 우선순위 (v0.3.0)

### P0 — 실제 작동을 위한 필수
1. **카카오 로그인 실연동** — Supabase Auth + 카카오 OAuth2
2. **어드민 인증** — 비밀번호 또는 이메일 로그인
3. **Supabase 실제 데이터** — DB seed, 실제 INSERT/SELECT 검증

### P1 — 핵심 비즈니스 로직
4. **영수증 OCR** — 이미지 → 금액/가게명 자동 추출 (Google Vision or Clova)
5. **팀구매 자동 마감** — pg_cron or Supabase Edge Function
6. **카카오 공유** — 팀구매 딜 공유 딥링크
7. **포인트 실사용** — 서비스 결제 시 포인트 차감

### P2 — 성장 기능
8. **네이버 플레이스 실연동** — 플레이스 API or 크롤링
9. **AI 블로그 실연동** — Claude API + 네이버 블로그 발행
10. **미니 체험단 매칭** — 크리에이터 DB + 자동 매칭 알고리즘
11. **추천인 수수료 자동 계산** — referrals 테이블 기반 월별 정산

---

## 기술 부채

| 항목 | 심각도 | 설명 |
|------|--------|------|
| DEMO_USER_ID | Medium | UUID 형식 맞췄으나 실제 DB row 없음, Auth 연동 시 교체 필요 |
| API 응답 포맷 | Low | 표준 `{ data }` / `{ error }` 래퍼 없음 |
| 입력 검증 | Low | 서버측 Zod 검증 없음 |
| 테스트 | Low | 테스트 코드 없음 |

---

## 운영 환경

- **Supabase Project**: perma-studio (`nbfoifegbamvtwffbuxv`)
- **로컬 서버**: http://localhost:3000
- **어드민**: http://localhost:3000/admin
