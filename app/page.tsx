import type { ReactNode } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Sparkles,
  Check,
  PenLine,
  MapPin,
  Users,
  ShoppingBag,
  Receipt,
  Timer,
  TrendingUp,
  Gift,
  ArrowRight,
  Quote,
} from 'lucide-react';

/* ----------------------------- Section 2: Stats ---------------------------- */
const STATS: { value: string; label: string }[] = [
  { value: '32,000+', label: '사장님 사용 중' },
  { value: '48만원', label: '월 평균 절약' },
  { value: '3위↑', label: '블로그 순위 평균 상승' },
  { value: '최대 7%', label: '광고비 페이백' },
];

/* --------------------------- Section 5: Features --------------------------- */
const FEATURES: {
  icon: ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    icon: <PenLine size={26} strokeWidth={1.8} />,
    title: 'AI 블로그 자동화',
    desc: '키워드만 입력하면 AI가 매장 맞춤형 포스팅을 작성하고 원클릭으로 네이버 블로그에 발행합니다.',
  },
  {
    icon: <MapPin size={26} strokeWidth={1.8} />,
    title: '네이버 플레이스 최적화',
    desc: '내 가게 순위를 매일 트래킹하고 신호등(🔴🟡🟢)으로 진단해 무엇을 고쳐야 할지 알려줍니다.',
  },
  {
    icon: <Users size={26} strokeWidth={1.8} />,
    title: '미니 체험단',
    desc: '동네 크리에이터를 자동 매칭하고, 사장님끼리 품앗이 캠페인으로 무료로 후기를 쌓습니다.',
  },
  {
    icon: <ShoppingBag size={26} strokeWidth={1.8} />,
    title: '팀 구매',
    desc: '마케팅 패키지를 3~5명이 함께 공동 구매해 혼자 살 때보다 파격적인 가격에 이용하세요.',
  },
];

/* ------------------------- Section 6: Apptech rewards ----------------------- */
const RECEIPT_REWARDS: { store: string; item: string; reward: string }[] = [
  { store: '강남 청과', item: '채소·과일 12종', reward: '+320P' },
  { store: '신선마트', item: '돈육 5kg 외', reward: '+180P' },
  { store: '바다수산', item: '활광어 2미', reward: '+250P' },
];

/* ----------------------- Section 7: Team purchase preview ------------------- */
const GROUP_BUYS: {
  title: string;
  original: string;
  price: string;
  discount: string;
  joined: number;
  target: number;
  left: string;
}[] = [
  {
    title: 'AI 블로그 프리미엄 6개월',
    original: '594,000원',
    price: '297,000원',
    discount: '50%',
    joined: 4,
    target: 5,
    left: '03:12:47',
  },
  {
    title: '플레이스 순위관리 12개월',
    original: '1,200,000원',
    price: '720,000원',
    discount: '40%',
    joined: 2,
    target: 3,
    left: '11:58:02',
  },
];

/* --------------------------- Section 9: Testimonials ----------------------- */
const TESTIMONIALS: {
  quote: string;
  name: string;
  business: string;
}[] = [
  {
    quote:
      '대행사에 월 80만원씩 주다가 끊었어요. AI 블로그로 직접 올리니 플레이스 순위가 2주 만에 5위권으로 올라왔습니다.',
    name: '이정희 사장님',
    business: '연남동 · 수제버거 전문점',
  },
  {
    quote:
      '영수증만 찍어 올려도 포인트가 쌓이는 게 신기해요. 식자재 사는 김에 매달 4만원 넘게 돌려받고 있어요.',
    name: '박상우 사장님',
    business: '망원동 · 베이커리 카페',
  },
  {
    quote:
      '팀 구매로 마케팅 패키지를 반값에 샀어요. 혼자였으면 엄두도 못 냈을 텐데 동네 사장님들이랑 같이 하니 부담이 없네요.',
    name: '최은영 사장님',
    business: '성수동 · 브런치 레스토랑',
  },
];

export default function LandingPage() {
  return (
    <>
      <Navigation />
      {/* ============================ 1. HERO (dark) ============================ */}
      <section className="bg-dark-tile text-white">
        <div className="mx-auto flex max-w-content flex-col items-center px-6 py-24 text-center md:py-32">
          <span className="badge-animated mb-6 inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-4 py-2 text-caption text-white/90">
            <Sparkles size={14} className="text-primary" />
            AI 기반 마케팅 자동화
          </span>
          <h1 className="max-w-3xl text-[40px] font-semibold leading-[1.08] tracking-[-0.5px] md:text-hero">
            복잡한 마케팅,
            <br />
            이제 사장님이 직접 합니다
          </h1>
          <p className="mt-6 max-w-xl text-[20px] leading-[1.4] text-white/70 md:text-[28px]">
            네이버 권한 하나면 모든 마케팅이 무료
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="/signup" className="btn-pill btn-primary">
              무료로 시작하기
            </a>
            <a
              href="/hub"
              className="btn-pill border border-white/30 text-white hover:bg-white/10"
            >
              광고비 돌려받기
            </a>
          </div>
          <p className="mt-6 text-caption text-white/50">
            신용카드 없이 바로 시작 · 언제든 해지 가능
          </p>
        </div>
      </section>

      {/* ============================ 2. STATS (white) ========================= */}
      <section className="bg-canvas-white">
        <div className="mx-auto max-w-wide px-6 py-section">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-hairline bg-canvas-white p-6 text-center"
              >
                <div className="text-[34px] font-semibold tracking-tight text-primary md:text-[40px]">
                  {stat.value}
                </div>
                <div className="mt-2 text-caption text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 3. FOR SMB OWNERS (parchment) =================== */}
      <section className="bg-parchment">
        <div className="mx-auto grid max-w-wide items-center gap-12 px-6 py-section lg:grid-cols-2">
          <div>
            <span className="text-caption font-semibold uppercase tracking-wide text-primary">
              사장님을 위해
            </span>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-tight text-ink md:text-section">
              마케팅은 해야 하는데
              <br />
              돈이 없다면
            </h2>
            <p className="mt-5 max-w-md text-body text-muted">
              대행사 비용 없이, 사장님이 직접 할 수 있도록 모든 도구를 무료로
              드립니다. 어렵게 느껴지던 마케팅을 클릭 몇 번으로 끝내세요.
            </p>
            <a
              href="/signup"
              className="btn-pill btn-primary mt-8 inline-flex"
            >
              무료로 시작하기
            </a>
          </div>
          <ul className="space-y-4">
            {[
              'AI가 블로그 글을 대신 써주고 원클릭으로 발행',
              '네이버 플레이스 순위를 매일 자동 진단',
              '동네 크리에이터 체험단을 무료로 매칭',
              '식자재 영수증만 올려도 포인트 적립',
              '마케팅 패키지를 팀 구매로 반값에',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-hairline bg-canvas-white p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-primary text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-body text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ====================== 4. FOR MARKETERS (dark) ======================= */}
      <section className="bg-dark-tile text-white">
        <div className="mx-auto grid max-w-wide items-center gap-12 px-6 py-section lg:grid-cols-2">
          <div>
            <span className="badge-animated inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-caption font-semibold text-white">
              <TrendingUp size={14} />
              최대 7% 페이백
            </span>
            <h2 className="mt-5 text-[30px] font-semibold leading-[1.12] tracking-tight md:text-section">
              광고비는 쓰는데
              <br />
              돌아오는 게 없다면
            </h2>
            <p className="mt-5 max-w-md text-body text-white/70">
              퍼즐 사장님을 통해 집행한 네이버·메타·구글 광고비의 일부를
              포인트로 돌려받으세요. 쓰던 광고 그대로, 페이백만 더해집니다.
            </p>
            <a
              href="/hub"
              className="btn-pill btn-primary mt-8 inline-flex"
            >
              페이백 받기
            </a>
          </div>
          <ul className="space-y-4">
            {[
              '네이버·메타·구글 광고를 한 곳에서 관리',
              '집행 광고비의 최대 7%를 포인트로 환급',
              '권한 원클릭 연동으로 복잡한 세팅 없음',
              '성과 리포트를 사장님 눈높이로 자동 요약',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-primary text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-body text-white/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===================== 5. FEATURES GRID (white) ====================== */}
      <section className="bg-canvas-white">
        <div className="mx-auto max-w-wide px-6 py-section">
          <div className="mb-12 text-center">
            <h2 className="text-[30px] font-semibold tracking-tight text-ink md:text-section">
              필요한 모든 마케팅, 하나의 앱에서
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body text-muted">
              따로 배울 것 없이, 사장님이 바로 쓸 수 있는 핵심 기능들
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col rounded-lg border border-hairline bg-canvas-white p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-parchment text-primary">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-tagline text-ink">{feature.title}</h3>
                <p className="mt-3 flex-1 text-caption leading-[1.5] text-muted">
                  {feature.desc}
                </p>
                <a
                  href="/signup"
                  className="mt-5 inline-flex items-center gap-1 text-caption font-semibold text-primary"
                >
                  시작하기 <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== 6. APPTECH (parchment) ======================= */}
      <section className="bg-parchment">
        <div className="mx-auto grid max-w-wide items-center gap-12 px-6 py-section lg:grid-cols-2">
          <div>
            <span className="text-caption font-semibold uppercase tracking-wide text-primary">
              앱테크 리워드
            </span>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-tight text-ink md:text-section">
              영수증 올리면
              <br />
              포인트가 쌓입니다
            </h2>
            <p className="mt-5 max-w-md text-body text-muted">
              매일 사는 식자재 영수증을 사진으로 올리기만 하세요. 한 장당
              50~500원, 매장 운영하며 자연스럽게 마케팅 비용을 마련하세요.
            </p>
            <div className="mt-6 flex gap-3">
              <div className="rounded-md bg-canvas-white px-4 py-3 text-center">
                <div className="text-tagline font-semibold text-primary">
                  50~500원
                </div>
                <div className="text-caption text-muted">영수증 1장당</div>
              </div>
              <div className="rounded-md bg-canvas-white px-4 py-3 text-center">
                <div className="text-tagline font-semibold text-primary">
                  월 4만원+
                </div>
                <div className="text-caption text-muted">평균 적립</div>
              </div>
            </div>
          </div>

          {/* Receipt upload mockup */}
          <div className="rounded-lg border border-hairline bg-canvas-white p-6">
            <div className="mb-4 flex items-center gap-2 text-ink">
              <Receipt size={20} className="text-primary" />
              <span className="text-tagline">오늘 올린 영수증</span>
            </div>
            <ul className="space-y-3">
              {RECEIPT_REWARDS.map((r) => (
                <li
                  key={r.store}
                  className="flex items-center justify-between rounded-md bg-parchment px-4 py-3"
                >
                  <div>
                    <div className="text-body font-semibold text-ink">
                      {r.store}
                    </div>
                    <div className="text-caption text-muted">{r.item}</div>
                  </div>
                  <span className="text-tagline font-semibold text-primary">
                    {r.reward}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
              <span className="text-caption text-muted">오늘 적립 합계</span>
              <span className="text-tagline font-semibold text-ink">+750P</span>
            </div>
          </div>
        </div>
      </section>

      {/* =================== 7. TEAM PURCHASE preview (dark) ================= */}
      <section className="bg-dark-tile text-white">
        <div className="mx-auto max-w-wide px-6 py-section">
          <div className="mb-12 text-center">
            <span className="badge-animated inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-caption text-white/90">
              <ShoppingBag size={14} className="text-primary" />
              팀 구매 진행 중
            </span>
            <h2 className="mt-5 text-[30px] font-semibold tracking-tight md:text-section">
              여럿이 모이면, 반값이 됩니다
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body text-white/70">
              올웨이즈처럼 — 마케팅 패키지를 동네 사장님들과 함께 공동 구매하세요
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {GROUP_BUYS.map((g) => (
              <div
                key={g.title}
                className="rounded-lg border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-start justify-between">
                  <h3 className="max-w-[70%] text-tagline">{g.title}</h3>
                  <span className="rounded-pill bg-primary px-3 py-1 text-caption font-semibold">
                    {g.discount} 할인
                  </span>
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-[28px] font-semibold">{g.price}</span>
                  <span className="mb-1 text-caption text-white/40 line-through">
                    {g.original}
                  </span>
                </div>

                {/* progress */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-caption text-white/70">
                    <span>
                      {g.joined}/{g.target}명 참여
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer size={13} /> {g.left} 남음
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-pill bg-white/10">
                    <div
                      className="h-full rounded-pill bg-primary"
                      style={{ width: `${(g.joined / g.target) * 100}%` }}
                    />
                  </div>
                </div>

                <a
                  href="/team-purchase"
                  className="btn-pill btn-primary mt-6 w-full"
                >
                  {g.target - g.joined === 0
                    ? '마감 임박'
                    : `${g.target - g.joined}명 남음 · 참여하기`}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= 8. REFERRAL (white) ======================== */}
      <section className="bg-canvas-white">
        <div className="mx-auto grid max-w-wide items-center gap-12 px-6 py-section lg:grid-cols-2">
          <div>
            <span className="text-caption font-semibold uppercase tracking-wide text-primary">
              추천인 시스템
            </span>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-tight text-ink md:text-section">
              친구 소개할 때마다
              <br />
              수익이 생깁니다
            </h2>
            <p className="mt-5 max-w-md text-body text-muted">
              내가 추천한 사장님이 만드는 수익의 5%를 평생 받습니다. 한 번 소개로
              끝나지 않는, 진짜 평생 연금형 수익 구조입니다.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-pill bg-parchment px-5 py-3">
              <Gift size={18} className="text-primary" />
              <span className="text-body font-semibold text-ink">
                추천 수익의 5% · 평생 연금
              </span>
            </div>
            <div>
              <a
                href="/referral"
                className="btn-pill btn-secondary mt-8 inline-flex"
              >
                추천 링크 받기
              </a>
            </div>
          </div>

          {/* Referral tree visual */}
          <div className="rounded-lg border border-hairline bg-parchment p-8">
            <div className="flex flex-col items-center">
              <div className="rounded-md bg-primary px-5 py-3 text-center text-white">
                <div className="text-body font-semibold">나</div>
                <div className="text-caption text-white/80">월 +37만원 수익</div>
              </div>
              <div className="my-3 h-6 w-px bg-hairline" />
              <div className="flex gap-6">
                {['김사장', '이대표', '박점주'].map((name) => (
                  <div key={name} className="flex flex-col items-center">
                    <div className="rounded-md border border-hairline bg-canvas-white px-4 py-2 text-center">
                      <div className="text-caption font-semibold text-ink">
                        {name}
                      </div>
                      <div className="text-[11px] text-muted">5% 연금</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-caption text-muted">
                추천한 사장님이 늘어날수록
                <br />
                매달 받는 연금도 함께 늘어납니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== 9. SOCIAL PROOF (parchment) =================== */}
      <section className="bg-parchment">
        <div className="mx-auto max-w-wide px-6 py-section">
          <div className="mb-12 text-center">
            <h2 className="text-[30px] font-semibold tracking-tight text-ink md:text-section">
              이미 32,000명의 사장님이 쓰고 있습니다
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-body text-muted">
              직접 마케팅을 시작한 사장님들의 진짜 후기
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-lg border border-hairline bg-canvas-white p-6"
              >
                <Quote size={24} className="text-primary" />
                <p className="mt-4 flex-1 text-body leading-[1.5] text-ink">
                  “{t.quote}”
                </p>
                <div className="mt-6 border-t border-hairline pt-4">
                  <div className="text-body font-semibold text-ink">
                    {t.name}
                  </div>
                  <div className="text-caption text-muted">{t.business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== 10. FOOTER CTA (dark) ======================= */}
      <section className="bg-dark-tile text-white">
        <div className="mx-auto max-w-content px-6 py-24 text-center md:py-28">
          <h2 className="text-[34px] font-semibold leading-[1.1] tracking-tight md:text-display">
            지금 바로 시작하세요
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-body text-white/70 md:text-[21px]">
            네이버 권한 하나면, 오늘부터 사장님이 직접 마케팅하는 모든 도구가
            무료입니다.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/signup" className="btn-pill btn-primary">
              무료로 시작하기
            </a>
            <a
              href="/demo"
              className="btn-pill border border-white/30 text-white hover:bg-white/10"
            >
              데모 둘러보기
            </a>
          </div>
          <p className="mt-6 text-caption text-white/50">
            카드 등록 없이 30초 만에 시작
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
