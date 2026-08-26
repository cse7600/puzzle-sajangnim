# PLAN: 통합 수익·정산 탭 (unified_earnings_tab)

작성일: 2026-08-26
범위: UI/IA 설계 문서. 코드 변경 없음. 구현은 이 문서를 기준으로 진행.

배경: 정산/포인트 정보가 연동허브(정산내역), 영수증환급, 추천인, 수익현황 4개 화면에 흩어져 있다.
하나의 화면에서 "예상 / 확정 / 리워드" 3축으로 통합 관리하고, 연동허브의 정산내역 서브탭을 이 화면으로
흡수해 중복 노출을 없앤다.

---

## 1. 통합 탭 위치: `/earnings` 확장 (신규 라우트 없음)

**결정**
- 라우트: 기존 `/earnings` (`app/(app)/earnings/page.tsx`)를 확장한다. 새 라우트를 만들지 않는다.
- 사이드바: 항목을 "성장도구" 섹션에서 **"핵심" 섹션으로 이동**하고 라벨을 **"수익·정산"**으로 변경.
  핵심 섹션은 `연동허브` → `수익·정산` 2개 항목이 된다.
- `/earnings` 페이지 상단 헤더에 `/api/points/summary` 기반 포인트 잔액 요약 스트립을 추가
  (`usable` / `redeemable` / `total`) — 3개 탭 어디에 있어도 항상 보이는 고정 요소.

**근거**
- `/earnings`는 이미 `expected | confirmed | rewards` 3탭 셸을 갖고 있고, 사용자가 요구한 구조와 1:1로
  일치한다. 새 라우트(`/settlement` 등)를 만들면 기존 북마크·네비 학습이 깨지고 라우트만 하나 늘어난다.
- "정산내역+출금신청"이라는 돈 관련 핵심 기능이 들어오므로 "성장도구" 하위에 두는 것은 IA상 격이 맞지
  않는다. 연동허브(수익의 발생처)와 수익·정산(수익의 결과)을 핵심 섹션에 나란히 두면 사용자 멘탈모델이
  "연동한다 → 정산받는다"로 자연스럽게 이어진다.
- 기각 대안: `/hub` 안에 4번째 탭으로 통합 — 연동허브가 비대해지고, 영수증/추천인 포인트는 허브와 무관한
  데이터라 IA가 오히려 꼬인다. 기각.

**어떻게**
- `components/AppSidebar.tsx`: 핵심 섹션 배열에 `{ href: '/earnings', label: '수익·정산' }` 이동, 성장도구
  섹션에서 "수익현황" 제거.
- `app/(app)/earnings/page.tsx`: 탭 라벨은 `예상 수익` / `확정 수익` / `리워드` 유지.

---

## 2. "예상 수익" 탭 재정의

**결정 — 포함 항목**
| 소스 | 조건 | 표시 |
|---|---|---|
| 광고 페이백 | `paybacks.status IN ('draft','review_1','review_2')` | 전부 "처리중" 단일 배지 (기존 `PAYBACK_USER_STATUS_LABEL` 정책 유지) |
| 영수증 | `receipts.status = 'pending'` | "검토중" |
| 추천인 | 없음 (버킷 삭제) | — |

- **`confirmed`는 예상 탭에 넣지 않는다. 확정 탭으로 보낸다.** (근거는 3번 항목에서 상술)
- 추천 수익은 발생 즉시 `is_paid=true` 포인트 지급으로 바뀌었으므로 "예상 추천 수익" 개념은 삭제.
  API에서도 해당 쿼리를 제거한다(항상 빈 배열이므로 죽은 코드).
- 예상 탭 상단에 안내 문구 1줄: "처리중 금액은 검토 결과에 따라 달라질 수 있어요."

**근거**
- draft/review_1/review_2를 "처리중"으로 뭉뚱그리는 기존 정책은 유지한다. 내부 검수 단계(1차/2차 리뷰)는
  사용자에게 의미가 없고, 노출하면 "왜 2차 검토에서 멈춰 있죠?" 류의 CS만 늘린다.
- 예상 탭의 역할은 "곧 들어올 돈의 총량 미리보기"다. 액션이 없는 순수 열람 탭으로 유지해야 확정 탭
  (액션 존재)과의 역할 분담이 선명해진다.

**어떻게**
- 예상 탭 = 섹션 2개: `광고 페이백 (처리중)`, `영수증 환급 (검토중)`. 각 섹션은 기존 카드 리스트 스타일.
- 광고 페이백 섹션의 라인아이템은 플랫폼/계정명/기간/금액을 표시하되 상태 배지는 전부 "처리중" 하나.

---

## 3. "확정 수익" 탭 재정의 — 이번 통합의 핵심

**결정 — 2존(Zone) 구조**

사용자 문구 "확정(확정된 포인트 지급)"과 `confirmed`(확정됐지만 아직 지급 전, 출금 신청 가능) 사이의
애매함은 이렇게 해소한다: **확정 탭 = "확정된 모든 것"이며, 그 안에서 '지급 전(액션 필요)'과 '지급 완료
(열람)'를 존으로 분리한다.** `confirmed`를 예상 탭에 넣으면 상태 라벨("확정 — 출금 신청 가능")과 탭
이름("예상")이 정면 충돌하고, 사용자가 취해야 할 유일한 액션(출금 신청)이 열람용 탭에 파묻힌다. 기각.

### Zone A — "출금 신청" 액션 존 (탭 최상단 고정)
- 대상: `paybacks.status = 'confirmed'`인 건만.
- UI: 강조 카드(테두리 색 CSS 변수 `--accent` 계열, 다른 카드보다 시각적 위계 한 단계 위). 카드 헤더에
  "출금 신청 가능 금액 합계"와 가장 임박한 `withdrawal_deadline` 기준 **D-day 카운트다운**
  ("D-3 · 기한 내 미신청 시 포인트로 자동 전환됩니다").
- 카드 내부: 기존 `SettlementTable`의 confirmed 라인아이템 + `<WithdrawalAction>` 버튼 그대로 재사용
  (플랫폼/계정명/금액/D-day/출금 신청 버튼, 신청 완료 건은 "출금 신청 접수됨" 상태 텍스트).
- confirmed 건이 0개면 Zone A 자체를 렌더링하지 않는다 (빈 강조 카드 금지).

### Zone B — "지급 완료 내역" 열람 존
- 대상 4종:
  1. `paybacks.status = 'paid'` — **현금 지급**
  2. `paybacks.status = 'converted_to_points'` — 포인트 전환
  3. `receipts.status = 'approved'` — 영수증 포인트
  4. `referral_earnings` 전체 (즉시 지급이므로 전량 확정) — 추천 포인트
  5. (신규 편입) `point_transactions.type IN ('knowledge_question','knowledge_answer')` — 지식거래소
     수익 포인트. 이것도 "번 돈"이므로 확정 탭 소속. 리워드가 아니다.

**현금 vs 포인트 시각 구분 (구체안)**
- 금액 단위 표기 자체를 다르게: 현금은 `₩120,000`, 포인트는 `12,000 P`. 접미사 P는 포인트 토큰 색상
  (기존 디자인 시스템의 포인트 색 CSS 변수)으로 렌더링.
- 라인아이템 좌측에 소스 아이콘+배지: `현금`(은행 아이콘, `--color-cash` 변수) / `포인트`(P 아이콘,
  `--color-point` 변수). 배지 텍스트는 "현금 지급" / "포인트 지급".
- Zone B 헤더에 요약 2칸: "현금으로 받은 금액 ₩X" / "포인트로 받은 금액 Y P" — 합산해서 하나의 숫자로
  뭉치지 않는다. 단위가 다른 값을 합치는 순간 혼동이 시작된다.
- Zone B 내부 섹션 순서: 광고 페이백(월별 그룹, 5번 항목 참조) → 영수증 → 추천인 → 지식거래소.

---

## 4. "리워드" 탭

**결정**: `point_transactions.type IN ('reward','community')` 2종 포함.

**근거**
- `reward`(이벤트성 지급)와 `community`(활동 적립)는 둘 다 "내가 번 수익"이 아니라 "활동에 대한 보상"
  이라는 같은 성격이다. 사용자 입장에서 구분 실익이 없고 리워드 탭이 항목 1종짜리 빈약한 탭이 되는 것도
  막는다.
- `knowledge_*`는 보상이 아니라 거래 수익이므로 확정 탭(3번 항목)으로. `redeem`/`refund`는 수익이 아니라
  사용/환불이므로 이 화면 어디에도 넣지 않는다(포인트 상세 사용내역은 별도 화면 소관).

**어떻게**: 단순 시간순 카드 리스트(라벨/날짜/`+N P`). 섹션 2개(이벤트 리워드 / 커뮤니티 활동).

---

## 5. 월별 그룹핑 적용 범위

**결정: 광고 페이백에만 적용. 나머지는 단순 시간순 리스트.**

**근거**
- 월별 그룹 헤더(지급예정일·월 합계·PDF 정산내역서)는 "사업자 세무/장부 목적 정산서"라는 광고 페이백
  고유 요구에서 나온 기능이다. 영수증/추천/리워드는 건당 소액·수시 발생 포인트라 월 단위 정산서 개념이
  없고, 억지로 월 그룹핑하면 빈 그룹·1건짜리 그룹만 늘어나 스캔 효율이 떨어진다.
- 적용 위치: 확정 탭 Zone B의 광고 페이백 섹션(`SettlementTable` 재사용 = 월 그룹 + PDF 다운로드 유지),
  예상 탭의 광고 페이백 섹션(월 그룹만, PDF 없음 — 미확정 금액의 정산서 발급은 오해 소지).
- 비-페이백 리스트는 항목이 20건을 넘으면 "2026년 8월" 식의 얇은 월 구분 텍스트 디바이더만 삽입
  (합계·PDF 없음). 이건 그룹핑이 아니라 시각적 이정표다.

---

## 6. `/hub`의 남은 역할

**결정**
- `/hub` 내부 탭을 `accounts` + `guide` 2개로 축소. `statements` 탭과 `SettlementTable` 렌더링 제거.
- `accounts` 탭 상단에 정산 요약 배너 1개 추가: "이번 달 확정 대기 N건 · 출금 신청 가능 ₩X →
  **수익·정산에서 관리하기**" (`/earnings?tab=confirmed` 링크). 데이터가 없으면 "정산 내역은 수익·정산
  탭에서 확인하세요" 정적 문구로 대체.
- 이탈 방지: `/hub?tab=statements` 딥링크(북마크·기존 안내 메일 등)로 들어오면
  `/earnings?tab=confirmed`로 `redirect` 처리. 페이지 내 탭 상태에 `statements`가 남아있을 수 없게
  타입에서도 제거.

**근거**
- 같은 정산 데이터가 두 화면에 보이는 것이 이번 통합이 없애려는 혼선의 본체다. "축약본이라도 남기자"는
  절충은 결국 두 화면을 다 관리하게 만들므로 기각. 대신 배너가 "여기 있던 것이 어디로 갔는지"를 매 방문마다
  알려줘서 학습 전환을 돕는다. 배너는 2~3릴리즈 후 정적 문구로 다운그레이드 가능.

---

## 7. `/rewards`, `/referral`과의 관계

**결정: 두 페이지 모두 "도구 + 최근 5건 축약"으로 유지. 전체 내역은 통합 탭 전담.**

- `/rewards` (영수증 환급): 업로드 UI는 그대로. 본인 영수증 목록은 **최근 5건**으로 축소하고 하단에
  "전체 적립 내역 보기 → 수익·정산" 링크(`/earnings?tab=confirmed`). 방금 올린 영수증의 접수/검토 상태를
  업로드 직후 같은 화면에서 확인하는 피드백 루프는 필수라서 전면 제거는 기각.
- `/referral` (추천인): 추천코드 공유/친구 목록은 그대로. 누적 추천 수익은 **총액 1개 숫자 + 최근 5건**만
  남기고 동일한 링크 추가. 추천 수익이 즉시 포인트 지급이 된 지금, 이 페이지의 수익 리스트는 "공유 동기
  부여용 증거" 역할만 하면 충분하다.

**근거**: 도구 화면에서 방금 한 행동의 결과가 안 보이면 사용자는 불안해서 화면을 오간다(제거 시 UX 악화).
반면 전체 히스토리 탐색은 통합 탭 하나로 몰아야 "내역은 어디서 보지?"라는 질문의 답이 항상 하나가 된다.

---

## 8. `/api/earnings` 재설계

### 8-1. 공용 헬퍼 추출 (신규 `lib/paybacks.ts`)
`app/api/paybacks/route.ts`의 조회+`attachWithdrawalInfo()` 로직을 라이브러리로 추출해 두 라우트가 공유:

```ts
// lib/paybacks.ts
import type { PaybackStatus, WithdrawalStatus } from '@/lib/hub';

export interface PaybackLineItem {
  id: string;
  platform: string;
  account_name: string;
  period: string;              // 'YYYY-MM'
  ad_spend: number;
  payback_rate: number;
  amount: number;
  status: PaybackStatus;
  payout_due_date: string | null;
  withdrawal_deadline: string | null;                       // 절대 누락 금지
  withdrawal: { id: string; status: WithdrawalStatus } | null; // 절대 누락 금지
}

export async function getUserPaybacks(
  userId: string,
  statuses?: PaybackStatus[],
): Promise<PaybackLineItem[]>;
```
`/api/paybacks`는 이 헬퍼를 호출하는 얇은 라우트로 리팩터링(응답 스키마 불변 → SettlementTable 무수정).

### 8-2. `/api/earnings` 응답 타입

```ts
type EarningsTab = 'expected' | 'confirmed' | 'rewards';
type AmountUnit = 'KRW' | 'P';

interface EarningsItem {
  id: string;
  source: 'payback' | 'receipt' | 'referral' | 'knowledge' | 'reward' | 'community';
  label: string;
  amount: number;
  unit: AmountUnit;
  date: string;              // ISO
  statusLabel: string;       // '처리중' | '검토중' | '현금 지급' | '포인트 지급' 등 사용자용 라벨
}

interface EarningsSection {
  key: string;
  label: string;
  unit: AmountUnit;
  amount: number;            // 섹션 합계 (단위 동일 항목만 합산)
  items: EarningsItem[];
}

interface ExpectedResponse {
  tab: 'expected';
  totalPending: number;                 // 참고용 합계 (단위 혼합 없음: 페이백 P + 영수증 P)
  paybackMonths: PaybackMonthGroup[];   // SettlementTable용 월 그룹 (status: draft/review_1/review_2)
  sections: EarningsSection[];          // 영수증 pending 섹션
}

interface ConfirmedResponse {
  tab: 'confirmed';
  actionable: {                         // Zone A
    totalAmount: number;
    nearestDeadline: string | null;     // D-day 계산용
    paybacks: PaybackLineItem[];        // status='confirmed', withdrawal 필드 포함
  };
  realized: {                           // Zone B
    cashTotal: number;                  // paid 합계 (KRW)
    pointTotal: number;                 // converted + receipt + referral + knowledge 합계 (P)
    paybackMonths: PaybackMonthGroup[]; // status IN ('paid','converted_to_points') 월 그룹
    sections: EarningsSection[];        // receipt / referral / knowledge 섹션
  };
}

interface RewardsResponse {
  tab: 'rewards';
  total: number;                        // P
  sections: EarningsSection[];          // reward / community 섹션
}

interface PaybackMonthGroup {
  period: string;                       // 'YYYY-MM'
  payoutDueDate: string | null;
  leastProgressedStatus: PaybackStatus; // 기존 SettlementTable 배지 로직 유지
  totalAmount: number;
  items: PaybackLineItem[];
}
```

### 8-3. 탭별 빌더 시그니처와 쿼리

```ts
// app/api/earnings/route.ts
async function buildExpected(userId: string): Promise<ExpectedResponse>
// - getUserPaybacks(userId, ['draft','review_1','review_2']) → groupByPeriod()
// - receipts: .eq('user_id', userId).eq('status','pending')
// - referral 쿼리 삭제 (구조적으로 항상 빈 결과)

async function buildConfirmed(userId: string): Promise<ConfirmedResponse>
// - getUserPaybacks(userId, ['confirmed'])                    → actionable.paybacks
// - getUserPaybacks(userId, ['paid','converted_to_points'])   → realized.paybackMonths
// - receipts: .eq('status','approved')
// - referral_earnings: .eq('user_id', userId)  (is_paid 필터 불필요 — 전량 지급됨)
// - point_transactions: .in('type', ['knowledge_question','knowledge_answer'])

async function buildRewards(userId: string): Promise<RewardsResponse>
// - point_transactions: .in('type', ['reward','community'])
```
- GET 진입 시 기존 `/api/points/summary`처럼 `convertExpiredPaybacks()` sweep을 먼저 실행
  (기한 지난 confirmed가 Zone A에 잘못 남는 것 방지).
- 헤더 요약 스트립은 기존 `/api/points/summary`를 **그대로 재사용** — 신규 API 불필요.
- 구버전 `fetchPaybacks(userId, 'pending'|'paid')` / `fetchReferrals(userId, isPaid)` 함수는 전부 삭제.

---

## 9. 컴포넌트 재사용 전략

**결정: `SettlementTable` + `WithdrawalAction`을 그대로 이동 재사용. 새로 짜지 않는다.**

- `components/hub/SettlementTable.tsx` → `components/earnings/SettlementTable.tsx`로 `git mv`
  (import 경로만 갱신, 로직 무수정). 출금 신청·D-day·PDF 다운로드는 이미 구현·검증된 자산이며, 재작성은
  회귀 위험만 산다.
- 다만 props 확장 1개: `variant?: 'expected' | 'confirmed'` — expected일 때 PDF 버튼·출금액션 컬럼을
  숨긴다(5번·2번 결정 반영). 기본값 'confirmed'로 기존 동작 보존.
- Zone A는 SettlementTable 전체가 아니라 그 안의 라인아이템 행+`WithdrawalAction` 조합을 감싸는 얇은
  래퍼 `components/earnings/WithdrawalActionCard.tsx` 신규 1개 (헤더 D-day + confirmed 라인 리스트).
  월 그룹 헤더가 필요 없는 소량 리스트라 테이블 통째 재사용은 과하다.
- 나머지 섹션(영수증/추천/지식/리워드)은 기존 `/earnings`의 섹션 카드 리스트 컴포넌트를 `unit`/`statusLabel`
  배지만 추가해 확장.

---

## 10. 구현 순서 (회귀 없는 마이그레이션, 7단계)

1. **lib 추출**: `lib/paybacks.ts` 신설, `/api/paybacks`를 헬퍼 기반으로 리팩터링. 응답 불변 확인
   (기존 `/hub` statements 탭이 그대로 동작해야 통과).
2. **API v2**: `/api/earnings` 재작성 (8번 스키마). 이 시점엔 프론트가 구 스키마를 쓰므로 배포 단위를
   3단계와 묶는다.
3. **`/earnings` 페이지 개편**: 3탭 본문을 새 스키마로 재구축. Zone A/B, SettlementTable은 아직
   `components/hub/` 경로 그대로 import. 이 단계에서 `/hub`와 `/earnings` 양쪽에 정산이 보이는 일시적
   중복은 허용(안전망).
4. **컴포넌트 이동**: `SettlementTable` → `components/earnings/`, `variant` prop 추가,
   `WithdrawalActionCard` 신규.
5. **`/hub` 축소**: statements 탭 제거, accounts 배너 추가, `?tab=statements` 리다이렉트.
6. **`/rewards`·`/referral` 축약**: 최근 5건 + 통합 탭 링크.
7. **사이드바 개편 + QA**: 라벨 "수익·정산"/핵심 섹션 이동. 시나리오 검증 — confirmed 건 출금 신청 →
   Zone A 상태 갱신, D-day 경과 건 sweep 후 Zone B `converted_to_points` 노출, `/hub?tab=statements`
   리다이렉트, PDF 다운로드, 예상 탭에 confirmed 미노출.

각 단계는 원자적 커밋 1개. 3단계 완료 전에는 5단계를 절대 먼저 하지 않는다(정산 열람 불가 공백 방지).
