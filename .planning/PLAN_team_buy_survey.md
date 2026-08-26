# PLAN: 팀구매 2차 개편 — 신청자 관리 페이지 + 양방향 설문

작성: 2026-08-26. 1차 개편(`PLAN_team_buy_revamp.md`, 마이그레이션 018) 위에 얹는 추가 기능.

## 실 DB 실측 (2026-08-26, service role REST — 스키마 드리프트 대응)

- `team_deal_survey_questions` / `team_deal_survey_responses`: **없음** (PGRST205) → 019에서 신설
- `users.phone`: **없음** (42703, 마이그레이션 001은 사문) → 연락처는 `ad_accounts.contact_phone`으로 대체
- `users` 실 컬럼: id, email, role, profile_data, created_at, updated_at
- `business_verifications` 실 컬럼: id, user_id, business_number, certificate_path, status, reviewer_note,
  submitted_at, reviewed_at, **tax_invoice_email**, business_address, naver_place_url, bank_name,
  account_number, account_holder, bankbook_copy_path — `created_at` 없음, 최신 판정은 `submitted_at` 기준
- `ad_accounts`: contact_phone 존재(널 가능), platform, account_name
- `ad_account_monthly_spend`: ad_account_id, period('YYYY-MM'), spend_vat_excluded
- `team_deal_members`: quantity/price_paid/status(joined|refunded|cancelled)/point_transaction_id/refund_transaction_id 확인
- `team_deals`: thumbnail_url, content_html 존재 (018 적용됨)

## 그레이존 결정 (discuss 확정)

1. **설문 문항은 딜 단위 공용** — 같은 딜 신청자는 모두 같은 질문 세트에 답한다.
2. **설문은 결제와 완전 분리** — 참여(join)는 기존 원자 RPC 그대로. 설문은 사후 이행 정보 수집용.
3. **스토리지**: 기존 `team-deal-images` 공개 버킷 재사용, 경로 `responses/{dealId}/{memberId}/{uuid}.{ext}`
   (randomUUID 파일명이라 추측 불가). 매직바이트 검증 로직은 `lib/image-upload.ts`로 추출해
   어드민 썸네일 업로드와 공유.
4. **제출 후 수정**: member status가 `joined`인 동안 자유 수정 허용. 부분 저장 허용
   (질문별 이동 시마다 저장 가능) — "작성완료" 판정은 필수 문항 전부 응답 여부로 서버가 계산.

## 마이그레이션 019 (추가형만)

```sql
create table team_deal_survey_questions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references team_deals(id) on delete cascade,
  position integer not null default 0,
  question_type text not null check (question_type in ('text','link','image')),
  label text not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);
create table team_deal_survey_responses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references team_deal_members(id) on delete cascade,
  question_id uuid not null references team_deal_survey_questions(id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, question_id)
);
-- RLS on·정책 0건 (team_deal_members와 동일 — 모든 접근은 service role 경유)
```

인덱스: questions(deal_id), responses(member_id). Management API로 실 DB 적용.

## API 계약

### 과제 1 — 어드민 신청자 관리

**GET `/api/admin/team-deals/[id]/members`** (응답 형태 변경 — 기존 클라이언트인 모달은 같이 삭제됨)

```jsonc
{
  "deal": { "id", "title", "status", "deal_price", "target_count", "current_count" },
  "questions": [{ "id", "position", "question_type", "label", "required" }],
  "members": [{
    "id", "user_id", "business_name", "email", "quantity", "price_paid",
    "status", "joined_at", "refund_transaction_id",
    "contact_phone": "ad_accounts.contact_phone 중 첫 non-null | null",
    "tax_invoice_email": "최신(submitted_at) business_verifications | null",
    "point_balance": 0,
    "prev_month_spend": [{ "platform", "account_name", "spend_vat_excluded" }],
    "prev_month_total": 0,
    "survey_status": "none | pending | partial | done",
    "responses": [{ "question_id", "value", "updated_at" }]
  }]
}
```

배치 조회(N+1 금지): users in(), business_verifications in(user_ids) → 유저별 submitted_at 최신 1건,
ad_accounts in(user_ids), ad_account_monthly_spend in(account_ids) + eq(period, 전월),
responses in(member_ids). 포인트 잔액만 unique user별 `getPointBalance` RPC를 Promise.all
(신청자 수십 명 규모, 원장 SUM의 canonical 래퍼 재사용).

survey_status: 질문 0개 → `none`, 응답 0건 → `pending`, 필수 문항 전부 응답 → `done`, 그 외 `partial`.

**PUT `/api/admin/team-deals/[id]/questions`** body `{ questions: [{ id?, position, question_type, label, required }] }`
— 전체 세트 저장: id 있으면 update, 없으면 insert, 목록에서 빠진 기존 문항은 delete(응답 cascade —
UI에서 confirm). 검증: label 비어있지 않음, type 3종.

**개별 취소·환불**: 기존 `POST /api/admin/team-deals/[id]/members/[memberId]/cancel` 그대로 재사용.

### 과제 2 — 사용자

**GET `/api/team-deals/my`** — 로그인 유저의 신청 내역

```jsonc
[{
  "member_id", "quantity", "price_paid", "status", "joined_at",
  "deal": { "id", "title", "thumbnail_url", "category", "deal_price", "status" },
  "survey": { "total", "required_total", "answered", "required_answered", "status": "none|pending|partial|done" }
}]
```

**GET `/api/team-deals/[id]/survey`** — 질문 + 내 기존 답변.
멤버 아님 → 403 구체 메시지. status가 joined 아니면 읽기만 허용하고 저장은 거부.

**PUT `/api/team-deals/[id]/survey`** body `{ answers: [{ question_id, value }] }`
— 넘어온 답만 upsert(부분 저장). 검증: question_id가 해당 딜 소속, link 타입은 http(s) URL 형식,
value 트림 후 비어있지 않음, member.status = joined.

**POST `/api/team-deals/survey-upload`** — formData(image, deal_id). 로그인 + 해당 딜 멤버 확인 후
`team-deal-images/responses/{dealId}/{memberId}/{uuid}.{ext}` 업로드, public URL 반환.
매직바이트 검증은 `lib/image-upload.ts`(admin upload/route.ts에서 추출)를 공유.

## 프론트

### 과제 1: `app/admin/team-deals/[id]/members/page.tsx` (신규)
- `TeamDealMembersModal.tsx` 삭제. 목록 페이지 "신청자" 버튼 → `router.push`로 이 페이지 이동.
- 상단: 딜 요약(제목/상태/모집현황) + "설문 문항 관리" 접이식 섹션
  (문항 추가/라벨/타입/필수/순서 위아래 이동/삭제, 저장 시 PUT questions).
- 신청자 테이블: 상호명/이메일/수량/결제P/상태/신청일 + 행 펼침 상세 패널:
  연락처, 담당자 수신메일, 현재 포인트 잔액, 전월 매체별 소진 요약(합계 포함),
  `/admin/users/[id]` 상세 링크(중복 구현 방지), 설문 답변(이미지는 썸네일+원본 링크,
  링크는 a 태그), 취소·환불 버튼(기존 기능 유지).
- 스켈레톤 로딩, 구체적 에러 메시지, 기존 어드민 톤(rounded-[18px] 카드, #0066cc).

### 과제 2: 사용자
- `app/(app)/team-buy/page.tsx`: 필 탭 "전체 딜 | 내 팀구매" (사이드바 항목 추가 없음).
  내 팀구매: `/api/team-deals/my` 리스트 카드(썸네일/제목/수량/결제P/상태/신청일 +
  설문 배지: 필수 미완=amber "추가 정보 입력 필요", done=green "작성완료", none=배지 없음).
  카드 클릭 → `/team-buy/[id]/survey`.
- `app/(app)/team-buy/[id]/survey/page.tsx` (신규): 타입폼 스타일 —
  상단 진행률 바(#0066cc), 한 화면 한 질문, 큰 타이포(질문 20~22px), 이전/다음(rounded-[9999px]),
  질문 이동 시 부분 저장, 마지막 제출, 부드러운 전환(translate+opacity transition),
  이미지 질문은 업로드 → 미리보기, 링크 질문은 URL 형식 클라이언트 검증,
  스켈레톤 로딩, 룩앤필은 앱 기존 톤 유지(그라데이션 금지).

## 실행 순서 (원자 커밋)

1. `docs+feat`: PLAN 문서 + `migrations/019_team_deal_survey.sql` + 실 DB 적용 — PO 직접
2. `feat`: 과제 1 어드민 신청자 관리 페이지 전환 + 정보 보강 API — 포크 A
3. `feat`: 설문 문항 관리(어드민) + 답변 열람 — 포크 A
4. `feat`: 내 팀구매 탭 + 타입폼 설문 + 사용자 업로드 — 포크 B (A 완료 후)
5. `docs`: VERIFICATION_team_buy_survey.md — gap-detector 검증 (Match Rate ≥ 90%)

배포(push/vercel) 없음 — 로컬 커밋까지만.

---

# 부록 (2026-08-26 추가 요구): 딜 오픈 전제조건 + 제출 현황 가시화

## 불변식
**설문 문항(요청서)이 0개인 딜은 고객에게 노출(active)될 수 없다.**
개별 참여자의 답변 제출 여부와는 무관 — 참여/결제는 기존대로 즉시 원자 처리.

## 설계 결정
1. **`draft` 상태 도입** (migration 020, 실 DB CHECK에 draft 없음 실측 후 완화형 스왑).
   문항 없이 저장하는 초안 흐름을 막지 않기 위함.
2. **문항 편집을 딜 생성/편집 흐름(TeamDealFormModal)에 인라인 통합.**
   - `POST /api/admin/team-deals`: body에 `questions: [{ position, question_type, label, required }]` 허용.
     딜 insert 후 문항 insert. **status = 문항 ≥ 1개면 'active', 0개면 'draft'**(자동 판정,
     응답에 status 포함 — UI가 "문항이 없어 비공개 대기로 저장됨" 안내).
   - `PATCH /api/admin/team-deals/[id]` (edit): body에 `questions` 있으면 세트 저장(PUT 로직과 동일).
     저장 후 재판정: draft + 문항 ≥ 1 → active 자동 전환. active + 문항 0개로 만들려는 요청 → 400
     ("모집중인 딜의 요청서 문항을 전부 삭제할 수 없습니다" 류).
   - `PUT /api/admin/team-deals/[id]/questions`(기존): 같은 불변식 — active 딜에 빈 세트 → 400.
     draft 딜에 문항 추가 시 active 자동 전환은 하지 않음(전환은 딜 편집 저장 경로로 일원화).
   - `GET .../questions` 핸들러 추가 — 모달이 편집 시 기존 문항 로드.
3. **사용자 노출 차단**: 사용자 목록은 이미 `status='active'` 필터. 상세 GET도 draft면 404.
4. **어드민 UI**:
   - TeamDealFormModal에 "요청서 문항" 섹션(추가/라벨/타입/필수/순서/삭제) 인라인.
     저장 시 questions를 POST/PATCH body에 포함. 문항 0개로 저장 시 draft 저장됨을 사전 안내.
   - 어드민 목록: status 'draft' 라벨 "비공개(문항 필요)" 계열 배지 추가.
   - 신청자 관리 페이지: 문항 편집 섹션 제거 → 읽기 전용 문항 요약 + "문항 수정은 딜 편집에서" 안내.
5. **제출 현황 가시화(신청자 관리 페이지)**: 신청자 테이블 행에 제출 배지
   (작성완료 green / 부분작성 M·N amber / 미작성 red 계열 / 문항없음 무배지) +
   "N문항 중 M답변" 카운트를 목록에서 바로 표시. 행 펼침에 답변 상세(기존 구현 유지 —
   텍스트 그대로/링크 클릭 가능/이미지 미리보기).
6. **처리 상태(미확인/확인함) 토글은 이번 범위에서 제외** — 선택 사항이며 가시성 핵심에 집중.

## 추가 커밋
6. `feat`: migration 020 + PLAN 부록 — PO 직접
7. `feat`: 딜 오픈 게이트(서버) + 폼 모달 문항 통합 + draft 상태 UI
8. `feat`: 신청자 관리 제출 현황 배지 + 문항 편집 섹션 정리
9. `docs`: VERIFICATION 부록 갱신
