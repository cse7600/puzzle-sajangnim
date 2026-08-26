# PLAN — 출금 신청 & 포인트 단일 재화 경제

**작성일:** 2026-08-26
**스코프:** 출금 신청 워크플로우, 미신청 정산금의 포인트 자동 전환, 포인트 원장 부호 컨벤션 확정, 영수증 적립 갭 메우기, 팀구매 포인트 결제
**범위 밖:** 추천인 수익(`referral_earnings`) 포인트 지급(§6에서 근거 설명), 팀구매 상품 등록 어드민 UI, 포인트 유효기간/소멸 정책(후속 과제로만 언급)
**전제:** migrations/*.sql은 실 DB와 다를 수 있음 — 본 문서는 실측 스키마(2026-08-26 확인)만 근거로 삼는다. 적용 전 `.claude/.../schema-drift-supabase.md` 재확인.

---

## 0. 핵심 결정 요약

| # | 결정 | 한 줄 근거 |
|---|------|-----------|
| D-01 | 포인트 잔액 = `SUM(point_transactions.amount)`. 적립 양수 / 차감 음수. 별도 잔액 컬럼 없음 | 원장 단일 진실. 잔액 컬럼은 드리프트 위험만 추가 |
| D-02 | 1포인트 = 1원 고정 | 환율 테이블 불필요. 정산금→포인트 전환이 무손실 |
| D-03 | `paybacks.status`에 `converted_to_points` 종결 상태 추가. `paid`와 대등 | 현금 지급과 포인트 전환을 같은 원장에서 구분 |
| D-04 | 출금 신청 창 = `confirmed` 전이 시점 + 7일 (`withdrawal_deadline` 컬럼에 명시 저장) | 상시 신청 허용 시 정산이 무기한 미결. 회계 마감 필요 |
| D-05 | 만료 전환은 배치가 아닌 lazy sweep (조회 API 진입 시 동기 처리) | 배치 인프라 부재. 조건부 UPDATE로 멱등 보장 가능 |
| D-06 | 출금은 payback 건 단위 전액. 부분 출금 없음. 최소 출금액 10,000원 | 원장·검토 흐름 단순화. 소액 이체 실비 방지 |
| D-07 | 포인트 차감·팀구매 참여는 Postgres 함수(RPC) 1개로 원자 처리 | supabase-js는 멀티 스테이트먼트 트랜잭션 불가. 돈은 DB에서 잠근다 |
| D-08 | `point_transactions.type`에 `'payback'`(적립), `'refund'`(환불 적립) 추가. 차감은 기존 `'redeem'` 재사용 | CHECK 확장 최소화. redeem = "포인트 사용" 범용 차감 타입으로 확정 |
| D-09 | 정산 전환/환불 포인트는 일일 캡(60,000P) 면제 | 확정된 돈이 캡에 잘리면 재화가 증발. 캡은 활동성 적립 전용 |
| D-10 | 신규 테이블 전부 RLS enable + 정책 0개 (008/009 패턴) | 계좌·정산 데이터. service_role 경유만 허용 |

---

## 1. 포인트 단일 재화 원칙

### 무엇을
- **잔액 정의:** `point_balance(user) = SUM(point_transactions.amount WHERE user_id = user)`. 음수 잔액은 시스템 불변식 위반(차감 경로가 전부 잔액 검증을 거치므로 정상 흐름에선 발생 불가).
- **부호 컨벤션 (이번에 확정):**

| type | 부호 | 용도 | daily cap |
|------|------|------|-----------|
| `receipt` | + | 영수증 승인 적립 | 적용 |
| `knowledge_question` / `knowledge_answer` / `community` | + | 커뮤니티 활동 | 적용 |
| `referral` / `reward` | + | (기존 예약, 이번 범위 밖) | 적용 |
| `payback` (신규) | + | 미출금 정산금 포인트 전환 | **면제** |
| `refund` (신규) | + | 팀구매 실패 시 환불 | **면제** |
| `redeem` | **−** | 포인트 사용(팀구매 등). amount는 항상 음수로 기록 | 해당 없음 |

- **잔액 조회:** JS에서 전 행을 당겨 합산하지 않는다. SQL 함수 RPC로 조회.

```sql
-- 010 마이그레이션에 포함
create or replace function public.get_point_balance(p_user_id uuid)
returns bigint language sql stable
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.point_transactions
  where user_id = p_user_id;
$$;
```

```ts
// lib/points.ts 확장 — LooseDb 패턴 유지
export async function getPointBalance(userId: string): Promise<number> {
  const { data: balance } = await (supabaseAdmin as unknown as LooseRpc)
    .rpc('get_point_balance', { p_user_id: userId });
  return Number(balance ?? 0);
}
```

- **`awardPoints()` 시그니처 확장** (기존 호출부 무수정 호환 — 옵션 파라미터):

```ts
export async function awardPoints(params: {
  userId: string;
  requestedAmount: number;
  type: PointType;               // 'payback' | 'refund' 추가
  description: string;
  referenceId?: string;
  capExempt?: boolean;           // true면 daily cap 미적용 + daily_point_limits 미기록
}): Promise<{ awarded: number; capped: boolean; todayTotal: number }>
```

`capExempt: true`일 때: 한도 조회·upsert를 건너뛰고 전액 insert. `todayTotal`은 조회값 그대로 반환(활동 한도에 영향 없음을 호출부가 알 수 있게).

### 왜
- 별도 balance 컬럼(캐시)은 원장과의 정합성 유지 코드가 필요하고, 공유 DB에서 드리프트 사고 이력이 이미 있다. 원장 SUM이 유일 진실이면 정합성 버그 클래스 자체가 사라진다.
- cap 면제를 별도 함수로 쪼개지 않고 옵션으로 둔 이유: 원장 insert 로직(부호, reference_id, description)이 한 곳에만 존재해야 감사가 쉽다.

---

## 2. 출금 신청 상태 머신

### 신청 시간 창 정책 (결정: deadline 방식)

**confirmed 전이 시점에 `withdrawal_deadline = confirmed_at + 7일`을 paybacks에 명시 저장한다.** 사용자는 그 안에 출금 신청. 미신청 시 포인트 자동 전환.

- 대안 A (상시 신청 + payout run 스냅샷): 월 배치 시점에 신청 여부를 캡처. **기각** — cron 인프라가 없고, confirmed 건이 무기한 미결 상태로 남아 어드민 정산 화면이 닫히지 않는다.
- 대안 B (즉시 강제 선택): confirmed 노출 시 즉시 택일 강제. **기각** — 사장님이 앱을 매일 열지 않는다. 유예 없이 전환하면 "출금할 기회가 없었다" 분쟁.
- **채택 (deadline 컬럼 저장):** 계산식(`confirmed_at + interval`)이 아니라 컬럼에 저장하는 이유 — 어드민이 개별 건 마감 연장 가능해야 하고(민원 대응), 정책 기간이 바뀌어도 기존 건에 소급되지 않는다.

### `withdrawal_requests` 스키마 초안

```sql
create table public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  payback_id uuid not null references public.paybacks(id),
  -- 신청 시점 payback.amount 스냅샷. 지급 근거 금액.
  amount bigint not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'rejected', 'canceled')),
  -- 신청 시점 business_verifications 계좌 정보 스냅샷 (이후 계좌 변경이 진행 중 지급에 영향 주지 않도록)
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  requested_at timestamptz not null default now(),
  -- admin-entry sentinel 세션이면 API 레이어가 NULL 기록 (008 entered_by와 동일 사유)
  processed_by uuid references public.users(id),
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- payback당 "활성/완결" 신청은 1건만. canceled/rejected는 재신청을 위해 제외.
create unique index withdrawal_requests_active_payback_idx
  on public.withdrawal_requests (payback_id)
  where status in ('requested', 'processing', 'paid');

create index withdrawal_requests_user_idx
  on public.withdrawal_requests (user_id, created_at desc);
create index withdrawal_requests_status_idx
  on public.withdrawal_requests (status, requested_at);

alter table public.withdrawal_requests enable row level security; -- 정책 없음 (D-10)
```

### 상태 전이표

**withdrawal_requests.status:**

| 현재 | 다음 | 행위자 | 조건 / 부수효과 |
|------|------|--------|----------------|
| (없음) | `requested` | 사용자 | payback이 `confirmed` && `now() <= withdrawal_deadline` && 계좌 정보 등록 && `amount >= 10000` |
| `requested` | `canceled` | 사용자 | deadline 이내에만. payback은 `confirmed` 유지 → 재신청 또는 만료 전환 경로로 복귀 |
| `requested` | `processing` | 어드민 | 접수(송금 준비). `processed_by/at` 스탬프 |
| `requested`/`processing` | `rejected` | 어드민 | `reject_reason` 필수. **부수효과: payback.withdrawal_deadline을 now()+7일로 연장** (§10-E4) |
| `processing` | `paid` | 어드민 | 실 송금 완료 후. **부수효과: payback.status → 'paid', processed_at 스탬프 (동일 트랜잭션 아님 — 순서와 실패 처리는 §4)** |

**paybacks.status (기존 5단계 + 신규 1단계):**

```
draft → review_1 → review_2 → confirmed ─┬─ (활성 출금 신청 paid) ──────────→ paid
                                          └─ (deadline 경과 && 활성 신청 없음) → converted_to_points
```

| payback 상태 | 사용자 노출 라벨 | 출금 신청 가능? |
|--------------|-----------------|----------------|
| draft / review_1 / review_2 | "처리중" (기존 `PAYBACK_USER_STATUS_LABEL` 유지) | 불가 |
| confirmed | "확정 — 출금 신청 가능 (D-day 표기)" | **가능** (deadline 이내) |
| paid | "지급 완료" | — |
| converted_to_points (신규) | "포인트 전환 완료" | — |

`lib/hub.ts`의 `PAYBACK_STATUSES`, `PAYBACK_STATUS_LABEL`, `PAYBACK_USER_STATUS_LABEL`에 `converted_to_points` 추가 필요.

---

## 3. 미신청 시 포인트 자동 전환 로직

### 트레이드오프 분석

| 방식 | 장점 | 단점 |
|------|------|------|
| cron 배치 (Vercel Cron 등) | 전환 시점 예측 가능, 조회 경로 오염 없음 | 이 프로젝트에 배치 인프라 전무. 실패 모니터링 체계도 없음. 새 운영 부담 |
| confirmed 전이 시점 동기 처리 | 코드 위치 명확 | 전이 "시점"엔 아직 deadline이 안 지났으므로 논리적으로 불가능 (전환은 미래 사건) |
| **lazy sweep (채택)** | 인프라 0. 사용자/어드민이 데이터를 보는 순간 항상 최신 상태 보장 | 아무도 조회 안 하면 전환이 지연됨 — 단, 잔액도 조회 시점에만 의미 있으므로 실해 없음 |

**채택: lazy sweep.** 지연의 유일한 실질 리스크는 "회계 마감 시점에 미전환 건 존재"인데, 어드민 정산 목록 조회가 sweep을 트리거하므로 마감 전 화면 확인만으로 해소된다.

### 구현 설계

```ts
// lib/settlement-points.ts (신규)
// confirmed && deadline 경과 && 활성 출금 신청 없음 → converted_to_points + 포인트 적립.
// 조건부 UPDATE ... returning 으로 동시 호출에도 이중 지급 불가 (멱등).
export async function convertExpiredPaybacks(userId?: string): Promise<number>
```

내부 동작 (함수 30줄 규칙에 맞춰 2~3개 헬퍼로 분리해 구현):

1. `update paybacks set status='converted_to_points', converted_at=now() where status='confirmed' and withdrawal_deadline < now() and (userId 조건) and id not in (select payback_id from withdrawal_requests where status in ('requested','processing','paid')) returning id, user_id, amount` — supabase-js 체이닝으로는 `not in (subquery)`가 안 되므로, **활성 신청 payback_id 목록을 먼저 조회한 뒤 `.not('id','in',...)` 필터**로 처리. 활성 신청 건수는 소규모라 문제없음.
2. returning된 각 행에 대해 `awardPoints({ userId, requestedAmount: amount, type: 'payback', capExempt: true, referenceId: payback.id, description: '${period} 광고 수수료 포인트 전환' })`.
3. 1의 UPDATE가 `where status='confirmed'` 조건부이므로, 두 요청이 동시에 sweep해도 한쪽만 행을 얻는다 → 포인트 insert도 한 번만.
4. 1은 성공했는데 2가 실패한 경우(포인트 미적립 고아): `status='converted_to_points'`인데 `point_transactions`에 `reference_id=payback.id and type='payback'` 행이 없는 건을 sweep 시작부에서 복구(재적립) 시도. 이 보정 검사 덕에 부분 실패도 자기치유된다.

**호출 지점 (3곳):**
- `GET /api/paybacks` (사용자 정산 목록) — 진입 시 `convertExpiredPaybacks(sessionUser.id)`
- `GET /api/points/summary` — 동일 (잔액 조회 전에 전환 반영)
- `GET /api/admin/paybacks` (어드민 정산 목록) — `convertExpiredPaybacks()` 전체 sweep

---

## 4. 기존 paybacks 5단계 리뷰 흐름과의 접합

### 무엇을
- `draft → review_1 → review_2 → confirmed` 어드민 리뷰는 **한 글자도 안 바꾼다.** 접합점은 confirmed 이후뿐.
- `PATCH /api/paybacks/[id]`의 `applyStatus()`에 가드 2개 추가:
  1. **`confirmed → paid` 직행 차단:** 대상 payback에 `status='processing'`인 출금 신청이 없으면 400 (`"활성 출금 신청 없이 지급 처리할 수 없습니다. 출금 관리 화면에서 처리하세요"`). 지급 완료 처리의 정본 경로는 어드민 출금 API(§9)이며, 그 API가 withdrawal.status=paid → payback.status=paid를 순서대로 수행한다.
  2. **종결 상태 불변:** `paid`/`converted_to_points`에서의 어떤 status 변경도 400. (되돌리려면 신규 draft 정산을 발행하는 것이 원칙 — 원장은 append-only.)
- `confirmed` 전이 시 `stampStatusAudit()`에 `update.withdrawal_deadline = <now + 7일의 date>` 추가.
- 어드민 출금 paid 처리 순서: **① withdrawal.status → paid (processed_by/at 스탬프) ② payback.status → paid.** ②가 실패하면 어드민 응답에 경고를 실어 재시도 유도하고, sweep의 보정 검사와 별개로 어드민 출금 목록에서 "withdrawal=paid && payback≠paid" 불일치 건을 표시한다. (supabase-js 2회 호출이라 원자적이지 않음을 인정하고, 불일치 감지를 설계에 포함하는 쪽을 택함 — 이 흐름까지 RPC화하는 것은 어드민 수동 작업 빈도 대비 과설계.)

### 왜
- 기존 리뷰 5단계는 이미 검증·감사 컬럼까지 붙어 운영 중(VERIFICATION_settlement_v2.md). 접합점을 confirmed 이후 단 하나로 못박아야 회귀 범위가 0이다.
- confirmed→paid 직행을 막지 않으면 "사용자 신청 없이 어드민이 실수로 현금 지급" 경로가 살아남아 이번 기능의 목적 자체가 무너진다.

---

## 5. 취소 / 재신청 / 최소 출금액 / 부분 출금 정책

| 정책 | 결정 | 근거 |
|------|------|------|
| 취소 | `requested` 상태에서만, deadline 이내 사용자 본인이 가능. soft delete(status=canceled) | `processing`은 어드민이 이미 송금 준비 중 — 취소 허용 시 이체 회수 리스크. 행 삭제 대신 status 변경으로 감사 추적 유지 |
| 재신청 | canceled/rejected 후 deadline 이내 무제한 재신청 가능 (partial unique index가 활성 1건만 강제) | 계좌 오기입 등 정정 재신청이 흔할 것. deadline이 총량 제한 역할 |
| 최소 출금액 | **10,000원.** `payback.amount < 10000`이면 신청 API가 400 → 포인트 전환 경로만 남음. UI에 사전 안내 | 소액 이체 수수료·어드민 처리 비용 방지. 포인트로는 전액 무손실 전환되므로 사용자 손해 없음 |
| 부분 출금 | 불가. payback 건 단위 전액 | 부분 출금 허용 시 잔여분 추적용 서브 원장이 필요해짐. 재화 흐름 단순성이 이번 설계의 최우선 가치 |
| 수수료 | 0원 (전액 지급) | 수수료는 이미 정산 단계(수수료율)에서 반영됨. 출금 단계 이중 공제 금지 |

---

## 6. 포인트 수급처 갭 메우기

### 영수증 (이번 범위 — 필수)

**파일:** `app/api/receipts/[id]/route.ts` PATCH.

현재 상태 무관하게 status를 덮어쓰고 포인트는 어디서도 안 준다. 다음으로 교체:

1. `body.status === 'approved'`일 때: `update receipts set status='approved' where id=:id and status='pending'` — **`.eq('status','pending')` 조건을 반드시 추가**하고 `.select('id, user_id, points_earned').maybeSingle()`.
2. returning 행이 있을 때만(= 이번 호출이 실제로 pending→approved 전이를 일으킨 유일한 호출) `awardPoints({ userId: receipt.user_id, requestedAmount: receipt.points_earned, type: 'receipt', referenceId: receipt.id, description: '영수증 적립 — ${store_name}' })`. 이미 approved였다면 0행 → 지급 없음 (멱등, 이중 지급 원천 차단).
3. 거절(`rejected`) 처리는 기존대로 status만 변경. **approved → rejected 번복 시 포인트 회수는 하지 않는다** — 회수(음수 receipt)는 잔액을 음수로 만들 수 있어 별도 정책 필요. 대신 approved 이후 상태 변경 자체를 400으로 막는다(종결 상태 불변, §4와 동일 원칙).
4. `points_earned`는 제출 시 `calcPoints()`가 이미 저장한 값을 그대로 사용. 승인 시점 재계산 금지(사용자에게 보여준 예정 적립액과 달라지면 안 됨).
5. 영수증 적립은 daily cap **적용** (capExempt 아님 — 활동성 적립).

### 추천인 수익 (범위 밖 — 판단 근거)

`referral_earnings.is_paid` 지급 트리거는 이번 범위에서 **제외**한다.

- 사용자 원문이 수급처로 "영수증, 커뮤니티, 광고 수수료" 3개만 명시했다.
- 추천 수익은 "현금 지급 전제(is_paid)"로 모델링돼 있어, 포인트로 전환하려면 별도 제품 결정(추천 보상을 돈으로 줄지 포인트로 줄지)이 선행돼야 한다. 임의로 정해 넣을 사안이 아님.
- 다만 이번 설계의 `payback` 전환 패턴(확정 금액 → capExempt 적립 → reference_id 역참조 멱등)이 그대로 재사용 가능하므로, 후속 결정만 나면 마이그레이션 1개(`type` CHECK에 값 추가) + 함수 호출 1곳으로 끝난다.

### 커뮤니티 (기존 동작 유지)

`knowledge`, `community` 호출부는 이미 `awardPoints()` 경유. 변경 없음. `PointType` 확장이 기존 유니언에 값을 추가할 뿐이므로 호환.

---

## 7. 포인트 사용처 — 팀구매

### 데이터 모델: `team_deal_members` 신설 (필요함)

현재 `current_count` 정수 하나로는 누가 참여했는지, 얼마를 냈는지, 환불을 누구에게 할지 알 수 없다. 참여 원장이 반드시 필요하다.

```sql
create table public.team_deal_members (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.team_deals(id) on delete cascade,
  user_id uuid not null references public.users(id),
  price_paid bigint not null check (price_paid > 0),   -- 참여 시점 deal_price 스냅샷 (포인트=원 1:1)
  point_transaction_id uuid not null references public.point_transactions(id), -- 차감 원장 역참조
  status text not null default 'joined' check (status in ('joined', 'refunded')),
  refund_transaction_id uuid references public.point_transactions(id),
  joined_at timestamptz not null default now(),
  unique (deal_id, user_id)                             -- 딜당 1인 1참여
);
```

### 참여 흐름: RPC 함수로 원자 처리 (D-07)

supabase-js는 호출 하나가 개별 트랜잭션이라 "잔액 확인 → 차감 → 참여 기록 → 카운트 증가"를 JS에서 이으면 어느 지점에서든 찢어질 수 있다. 돈이 걸린 유일한 다중 쓰기 경로이므로 여기만 Postgres 함수를 쓴다.

```sql
create or replace function public.join_team_deal(p_deal_id uuid, p_user_id uuid)
returns jsonb language plpgsql as $$
declare
  v_deal public.team_deals%rowtype;
  v_balance bigint;
  v_tx_id uuid;
  v_new_count integer;
begin
  select * into v_deal from public.team_deals where id = p_deal_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_deal.status <> 'active' then return jsonb_build_object('ok', false, 'reason', 'deal_not_active'); end if;
  if v_deal.deadline < now() then return jsonb_build_object('ok', false, 'reason', 'deal_expired'); end if;
  if v_deal.current_count >= v_deal.target_count then return jsonb_build_object('ok', false, 'reason', 'deal_full'); end if;
  if exists (select 1 from public.team_deal_members where deal_id = p_deal_id and user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'already_joined');
  end if;

  -- 같은 유저의 동시 차감(다른 딜 포함) 직렬화 — 잔액 검증과 insert 사이 끼어들기 방지
  perform pg_advisory_xact_lock(hashtext('points:' || p_user_id::text));

  select coalesce(sum(amount), 0) into v_balance
  from public.point_transactions where user_id = p_user_id;
  if v_balance < v_deal.deal_price then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_points', 'balance', v_balance);
  end if;

  insert into public.point_transactions (user_id, amount, type, description, reference_id)
  values (p_user_id, -v_deal.deal_price, 'redeem', '팀구매 참여 — ' || v_deal.title, p_deal_id)
  returning id into v_tx_id;

  insert into public.team_deal_members (deal_id, user_id, price_paid, point_transaction_id)
  values (p_deal_id, p_user_id, v_deal.deal_price, v_tx_id);

  update public.team_deals
  set current_count = current_count + 1,
      status = case when current_count + 1 >= target_count then 'completed' else status end
  where id = p_deal_id
  returning current_count into v_new_count;

  return jsonb_build_object('ok', true, 'new_count', v_new_count,
    'completed', v_new_count >= v_deal.target_count, 'price_paid', v_deal.deal_price);
end;
$$;
```

### 동시성
- **마지막 자리 race:** `select ... for update`가 딜 행을 잠가 정원 검증~카운트 증가가 직렬화된다. 두 명이 동시에 마지막 자리를 노리면 한 명은 잠금 해제 후 `deal_full`을 받는다.
- **동일 유저 이중 차감 race:** `pg_advisory_xact_lock('points:' + user_id)`이 같은 유저의 잔액 검증을 직렬화. `unique(deal_id, user_id)`가 최후 방어선.

### 라우트 수정 방향 (`app/api/team-deals/[id]/join/route.ts`)
- `supabase`(anon) → `supabaseAdmin` RPC 호출로 교체: `rpc('join_team_deal', { p_deal_id, p_user_id: sessionUser.id })`.
- `MOCK_DEALS` 폴백과 빈 catch **제거** (프로젝트 규칙 위반 코드. DB 실패는 구체 메시지로 500 응답).
- `reason`별 HTTP 매핑: `not_found` 404 / `deal_not_active`·`deal_expired`·`deal_full`·`already_joined` 409 / `insufficient_points` 402 (`balance` 포함해 부족액 안내).

### 환불 (딜 실패 시)
deadline 경과 && `current_count < target_count`인 active 딜 → status를 `'failed'`로 전환(기존 status CHECK 실측 확인 후 필요시 확장 — 011 주석에 명시)하고, `team_deal_members(status='joined')` 각각에 `awardPoints({ type: 'refund', requestedAmount: price_paid, capExempt: true, referenceId: member.id })` 후 `status='refunded', refund_transaction_id` 기록. 트리거는 §3과 동일한 lazy sweep(팀구매 목록 GET 진입 시). `where status='joined'` 조건부 UPDATE returning으로 멱등.

---

## 8. 신규 마이그레이션 SQL 초안

적용 방법은 기존 관례대로 Supabase Management API(`nbfoifegbamvtwffbuxv`). **적용 전 실 DB에서 `point_transactions` type CHECK 제약 이름과 `team_deals` status CHECK 존재 여부를 재확인할 것** (드리프트 이력).

### `migrations/010_withdrawal_requests.sql`

```sql
-- 출금 신청 워크플로우 + 정산금의 포인트 전환 경로 신설.
-- 사용자가 confirmed 정산에 대해 기한(withdrawal_deadline) 내 출금을 신청하면 현금 지급,
-- 신청하지 않으면 포인트(1P=1원)로 자동 전환된다.
-- 전부 추가형. DROP COLUMN 없음. users 테이블 미변경(FK 참조만).
-- 트리거 미사용 — updated_at 등은 코드에서 수동 (기존 스타일 유지).

-- (a) point_transactions.type 확장: + 'payback'(정산금 전환 적립), 'refund'(팀구매 환불 적립)
-- 차감은 기존 'redeem'을 재사용하며, redeem 행의 amount는 항상 음수라는 컨벤션을 이번에 확정한다.
-- 순서: CHECK 제거 → (백필 불필요 — 기존 행은 기존 타입만 사용) → 새 CHECK 추가 (008 (b) 트랩 회피 패턴)
alter table public.point_transactions
  drop constraint if exists point_transactions_type_check;

alter table public.point_transactions
  add constraint point_transactions_type_check
  check (type in ('receipt', 'knowledge_question', 'knowledge_answer',
                  'referral', 'reward', 'redeem', 'community',
                  'payback', 'refund'));

-- (b) paybacks: 종결 상태 'converted_to_points' 추가 + 출금 신청 마감일 + 전환 시각
alter table public.paybacks
  drop constraint if exists paybacks_status_check;

alter table public.paybacks
  add constraint paybacks_status_check
  check (status in ('draft', 'review_1', 'review_2', 'confirmed', 'paid', 'converted_to_points'));

alter table public.paybacks
  add column if not exists withdrawal_deadline timestamptz,
  add column if not exists converted_at timestamptz;

-- 기존 confirmed 행 백필: 배포 시점 기준 7일의 유예를 새로 부여한다.
-- (confirmed_at + 7일로 소급하면 이미 만료돼 사용자가 출금 기회를 잃는다 — 신뢰 문제)
update public.paybacks
  set withdrawal_deadline = now() + interval '7 days'
  where status = 'confirmed' and withdrawal_deadline is null;

-- (c) withdrawal_requests: 출금 신청 원장.
-- 계좌 정보는 신청 시점 business_verifications 값을 스냅샷한다 —
-- 신청 후 계좌를 바꿔도 진행 중인 지급 건의 근거가 흔들리지 않게.
create table if not exists public.withdrawal_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  payback_id uuid not null references public.paybacks(id),
  amount bigint not null check (amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'rejected', 'canceled')),
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  requested_at timestamptz not null default now(),
  -- processed_by: nullable. admin-entry sentinel 세션은 users 행이 아니므로 API가 NULL 기록 (008 패턴)
  processed_by uuid references public.users(id),
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- payback당 활성(requested/processing) 또는 완결(paid) 신청은 1건만.
-- canceled/rejected는 제외 — 기한 내 재신청 허용.
create unique index if not exists withdrawal_requests_active_payback_idx
  on public.withdrawal_requests (payback_id)
  where status in ('requested', 'processing', 'paid');

create index if not exists withdrawal_requests_user_idx
  on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status, requested_at);

-- RLS: 계좌번호를 담는 민감 테이블. 008/009와 동일하게 정책 없이 enable만 —
-- 앱은 supabaseAdmin(service_role) 경유로만 접근하고 service_role은 RLS를 우회한다.
alter table public.withdrawal_requests enable row level security;

-- (d) 포인트 잔액 조회 함수 — JS에서 원장 전 행 합산을 피한다.
create or replace function public.get_point_balance(p_user_id uuid)
returns bigint language sql stable
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.point_transactions
  where user_id = p_user_id;
$$;
```

### `migrations/011_team_deal_members.sql`

```sql
-- 팀구매 참여 원장 + 포인트 결제 원자 처리 함수.
-- 참여(잔액 검증→redeem 차감→참여 기록→카운트 증가)는 supabase-js로 원자화가 불가능해
-- 이 프로젝트 최초로 Postgres 함수(join_team_deal)를 도입한다. 돈이 걸린 유일한 다중 쓰기 경로다.
-- 전부 추가형. 기존 team_deals 컬럼 무변경.
-- 적용 전 확인: team_deals.status CHECK에 'failed'가 없으면 CHECK 제거→재추가로 확장할 것 (실측 필요).

create table if not exists public.team_deal_members (
  id uuid primary key default uuid_generate_v4(),
  deal_id uuid not null references public.team_deals(id) on delete cascade,
  user_id uuid not null references public.users(id),
  price_paid bigint not null check (price_paid > 0),
  point_transaction_id uuid not null references public.point_transactions(id),
  status text not null default 'joined' check (status in ('joined', 'refunded')),
  refund_transaction_id uuid references public.point_transactions(id),
  joined_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create index if not exists team_deal_members_deal_idx on public.team_deal_members (deal_id);
create index if not exists team_deal_members_user_idx on public.team_deal_members (user_id, joined_at desc);

alter table public.team_deal_members enable row level security; -- 정책 없음 (008/009 패턴)

create or replace function public.join_team_deal(p_deal_id uuid, p_user_id uuid)
returns jsonb language plpgsql as $$
-- §7의 함수 본문 그대로 (for update 행 잠금 + advisory lock + 잔액 검증 + redeem insert)
$$;
```

(011의 함수 본문은 §7 코드 블록을 그대로 옮긴다 — 문서 중복을 피하려 생략 표기.)

---

## 9. API 엔드포인트 설계

공통: 전 라우트 `getSessionUser()` 필수, `supabaseAdmin` 경유, `export const dynamic = 'force-dynamic'`.

### 사용자용

**`POST /api/withdrawals`** — 출금 신청

요청: `{ "payback_id": "uuid" }`

검증 순서 (실패 시 구체 메시지로 4xx):
1. payback 존재 && `payback.user_id === sessionUser.id` (아니면 404 — 남의 건 존재 여부도 숨김)
2. `payback.status === 'confirmed'` (409 `"확정된 정산만 출금 신청할 수 있습니다"`)
3. `now() <= withdrawal_deadline` (409 `"출금 신청 기한이 지났습니다. 포인트로 전환됩니다"`)
4. `payback.amount >= 10000` (400 `"10,000원 미만 정산은 포인트로만 전환됩니다"`)
5. `business_verifications`에서 `bank_name/account_number/account_holder` 3개 모두 존재 (428 `"정산 계좌를 먼저 등록해주세요"` — UI가 설정 화면으로 유도)
6. insert (계좌 3필드 스냅샷 포함). **partial unique index 위반(23505) → 409 `"이미 진행 중인 출금 신청이 있습니다"`** — 사전 select 없이 index를 동시성 방어선으로 사용.

응답 201: `{ "withdrawal": { id, payback_id, amount, status: "requested", requested_at, bank_name, account_holder } }` (account_number는 마스킹해서 반환)

**`GET /api/withdrawals`** — 내 신청 목록. 응답: `{ "withdrawals": [ ...위와 동일 shape + processed_at, reject_reason ] }`

**`DELETE /api/withdrawals/[id]`** — 취소. 본인 소유 && `status='requested'` && deadline 이내만. `update ... set status='canceled' where id=:id and user_id=:uid and status='requested'` 조건부 UPDATE returning — 0행이면 409. 응답 200 `{ "canceled": true }`.

### 어드민용 (`sessionUser.isAdmin` 체크, 실패 시 `forbiddenResponse()`)

**`GET /api/admin/withdrawals?status=requested`** — 신청 목록 (계좌번호 전체 노출, payback join으로 period/사업자명 포함). 진입 시 `convertExpiredPaybacks()` sweep + "withdrawal=paid && payback≠paid" 불일치 건 플래그(§4).

**`PATCH /api/admin/withdrawals/[id]`** — 요청: `{ "status": "processing" | "paid" | "rejected", "reject_reason"?: string }`

- 전이 규칙은 §2 표 그대로. 위반 시 409.
- `processed_by = actorUserId(sessionUser)` (sentinel이면 null), `processed_at = now()` 스탬프.
- `rejected`: `reject_reason` 없으면 400. 성공 시 payback.withdrawal_deadline을 `now()+7일`로 연장.
- `paid`: ① withdrawal 조건부 UPDATE(`where status='processing'`) → ② `paybacks.update({ status:'paid', processed_at })`. ② 실패 시 응답에 `"warning": "정산 상태 동기화 실패 — 재시도 필요"` 포함.

### 기존 라우트 수정 (파일 목록)

| 파일 | 수정 내용 |
|------|----------|
| `app/api/paybacks/[id]/route.ts` | `applyStatus()` 가드 2개(§4) + confirmed 전이 시 `withdrawal_deadline` 스탬프 + **활성 출금 신청 존재 시 `amount` PATCH 거부** (§10-E2) |
| `app/api/paybacks/route.ts` (사용자 GET) | 진입 시 `convertExpiredPaybacks(userId)`, 응답에 `withdrawal_deadline`·활성 신청 여부 포함 |
| `app/api/points/summary/route.ts` | 진입 시 sweep + 잔액을 `getPointBalance()` RPC로 교체 |
| `app/api/receipts/[id]/route.ts` | §6 승인 시 적립 + 조건부 UPDATE 멱등화 |
| `app/api/team-deals/[id]/join/route.ts` | §7 RPC 호출로 전면 교체, MOCK 폴백 제거 |
| `lib/points.ts` | `PointType` 확장, `capExempt`, `getPointBalance()` |
| `lib/hub.ts` | `PAYBACK_STATUSES` 등 3개 상수에 `converted_to_points` 추가 |
| `lib/settlement-points.ts` (신규) | `convertExpiredPaybacks()` + 고아 보정 |
| `types/database.ts` | 재생성하지 않고(드리프트 관례) 신규 테이블은 `LooseDb` 패턴 로컬 타입으로 처리 |

---

## 10. 엣지 케이스 목록

| # | 시나리오 | 처리 |
|---|----------|------|
| E1 | deadline 경과 후 뒤늦게 출금 신청 | POST 검증 3에서 409. 이때 payback이 아직 sweep 전(`confirmed`)이어도 deadline 비교로 차단되므로 "신청 성공 후 전환" 경합 불가. 신청 insert와 sweep이 정말 동시라면 — sweep의 활성 신청 제외 목록 조회와 insert 사이 틈이 있으므로, **POST 성공 직후 payback.status를 재확인해 `converted_to_points`면 신청을 즉시 canceled 처리하고 409 반환** (이중 수령 차단이 우선) |
| E2 | 신청 후 어드민이 payback.amount 수정 | 활성 신청(requested/processing) 존재 시 `amount` PATCH를 400 거부: `"진행 중인 출금 신청이 있습니다. 먼저 반려한 뒤 금액을 수정하세요"`. 스냅샷 amount와 지급액 불일치를 구조적으로 차단 |
| E3 | 계좌 미등록 상태에서 신청 | POST 검증 5에서 428 + 설정 화면 유도. 신청 시점 스냅샷 방식이므로 등록만 하면 즉시 재시도 가능 |
| E4 | 어드민 반려 후 deadline이 얼마 안 남음 | rejected 처리 시 deadline을 now()+7일로 자동 연장(§2). 반려 사유로 사용자가 기회를 잃지 않게 |
| E5 | 두 요청이 동시에 만료 sweep | `where status='confirmed'` 조건부 UPDATE — 한쪽만 행 획득, 포인트 1회만 적립 |
| E6 | sweep 중 status 변경 성공 후 포인트 insert 실패 | 고아 보정(§3-4): 다음 sweep이 `converted_to_points`인데 `payback` 타입 원장 없는 건을 재적립 |
| E7 | 팀구매 마지막 1자리 동시 참여 | `for update` 행 잠금으로 직렬화. 후순위는 `deal_full` 409 |
| E8 | 잔액 확인과 차감 사이 다른 딜에서 차감 | 유저 단위 advisory lock으로 직렬화(§7). 음수 잔액 불가 |
| E9 | 같은 payback에 동시 이중 신청 | partial unique index가 DB 레벨에서 차단(23505 → 409) |
| E10 | 팀구매 딜 실패 후 환불 sweep 중복 | `team_deal_members.status='joined'` 조건부 UPDATE returning — refund 1회만 |
| E11 | 영수증 승인 버튼 연타 | `where status='pending'` 조건부 UPDATE — 첫 요청만 적립 |
| E12 | admin-entry(비밀번호 쿠키) 세션이 출금 처리 | `actorUserId()` → null을 `processed_by`에 기록. `processed_at`은 항상 기록 (008 관례) |
| E13 | payback amount가 0원(정산액 0) | confirmed 시 withdrawal_deadline은 세팅되지만 최소액 미달로 신청 불가 → 만료 후 `awardPoints(requestedAmount: 0)`은 no-op — status만 `converted_to_points`로 종결. 고아 보정이 0원 건을 재시도하지 않도록 amount>0 조건 포함 |
| E14 | 사용자가 confirmed를 못 보고 7일 경과 (민원) | 포인트는 1:1 무손실 전환이므로 금전 손실 없음. 어드민이 개별 구제 필요 시: 별도 조치는 신규 정산 발행이 원칙 (converted_to_points 되돌리기 금지 — 원장 append-only). UI는 confirmed 시 홈 배너 + D-day 노출로 예방 |

---

## 부록 — 구현 순서 제안 (참고용, 이 문서 범위는 설계까지)

1. 010 마이그레이션 → `lib/points.ts` 확장 (다른 모든 것의 기반)
2. 영수증 적립 갭 (독립, 즉시 가치)
3. `lib/settlement-points.ts` + paybacks 라우트 가드 + 출금 API 3종
4. 어드민 출금 화면 + 사용자 정산 화면의 신청 UI
5. 011 마이그레이션 + 팀구매 RPC 교체 + 환불 sweep

각 단계 = 원자적 커밋. 완료 후 `/gsd:verify-work`.
