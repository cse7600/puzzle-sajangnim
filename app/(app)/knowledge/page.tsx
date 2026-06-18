'use client';

import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Flame,
  CheckCircle2,
  Trophy,
  Crown,
  Coins,
  ChevronRight,
  PenSquare,
  Inbox,
  CheckCheck,
} from 'lucide-react';

type FeedTab = 'all' | 'mine' | 'answered' | 'popular';

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'mine', label: '내 질문' },
  { key: 'answered', label: '내가 답한 것' },
  { key: 'popular', label: '인기' },
];

const CATEGORIES = [
  '전체',
  '네이버SEO',
  '광고',
  'SNS',
  '체험단',
  '블로그',
  '플레이스',
] as const;

type Category = (typeof CATEGORIES)[number];

interface Question {
  id: string;
  category: Exclude<Category, '전체'>;
  title: string;
  author: string;
  date: string;
  answers: number;
  reward?: number;
  adopted?: boolean;
  hot?: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: '네이버SEO',
    title: '블로그 저품질 판정받으면 탈출 방법 있나요?',
    author: '박*수',
    date: '3일 전',
    answers: 8,
    reward: 5000,
    adopted: true,
  },
  {
    id: 'q2',
    category: '플레이스',
    title: '악성 리뷰 어떻게 관리하나요?',
    author: '이*영',
    date: '5시간 전',
    answers: 12,
    hot: true,
  },
  {
    id: 'q3',
    category: '광고',
    title: '네이버 키워드 광고 입찰가 설정법',
    author: '최*철',
    date: '1일 전',
    answers: 5,
    reward: 3000,
  },
  {
    id: 'q4',
    category: 'SNS',
    title: '인스타 릴스 vs 유튜브 쇼츠, 음식점에 뭐가 낫나요?',
    author: '정*민',
    date: '2일 전',
    answers: 7,
  },
  {
    id: 'q5',
    category: '체험단',
    title: '체험단 사진 컷수 적정량?',
    author: '한*수',
    date: '4일 전',
    answers: 6,
    reward: 2000,
    adopted: true,
  },
  {
    id: 'q6',
    category: '블로그',
    title: '상위노출 글, 제목에 키워드 몇 번까지 넣어도 되나요?',
    author: '김*은',
    date: '6일 전',
    answers: 9,
    reward: 4000,
  },
  {
    id: 'q7',
    category: '플레이스',
    title: '플레이스 순위가 갑자기 떨어졌는데 원인이 뭘까요?',
    author: '오*진',
    date: '2일 전',
    answers: 11,
    hot: true,
  },
  {
    id: 'q8',
    category: '광고',
    title: '소상공인 광고 예산 월 30만원이면 어디에 쓰는 게 좋나요?',
    author: '서*호',
    date: '3일 전',
    answers: 4,
    reward: 3000,
  },
  {
    id: 'q9',
    category: 'SNS',
    title: '인스타 팔로워 늘리는데 해시태그 몇 개가 적당한가요?',
    author: '윤*아',
    date: '7일 전',
    answers: 6,
    adopted: true,
  },
  {
    id: 'q10',
    category: '블로그',
    title: '체험단 원고 받았는데 그대로 올리면 저품질 위험할까요?',
    author: '강*석',
    date: '1주 전',
    answers: 10,
    reward: 5000,
  },
];

const CATEGORY_STYLE: Record<Exclude<Category, '전체'>, string> = {
  네이버SEO: 'bg-green-50 text-green-700',
  광고: 'bg-orange-50 text-orange-700',
  SNS: 'bg-purple-50 text-purple-700',
  체험단: 'bg-cyan-50 text-cyan-700',
  블로그: 'bg-blue-50 text-blue-700',
  플레이스: 'bg-rose-50 text-rose-700',
};

interface Answerer {
  rank: number;
  name: string;
  answers: number;
  adoptRate: number;
  weeklyPoints: number;
}

const TOP_ANSWERERS: Answerer[] = [
  { rank: 1, name: '마케터 김**', answers: 34, adoptRate: 78, weeklyPoints: 45000 },
  { rank: 2, name: '마케터 이**', answers: 28, adoptRate: 82, weeklyPoints: 38000 },
  { rank: 3, name: '마케터 박**', answers: 21, adoptRate: 71, weeklyPoints: 29000 },
];

const RANK_COLOR: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-gray-300 text-white',
  3: 'bg-orange-300 text-white',
};

function formatPoints(n: number): string {
  return n.toLocaleString('ko-KR') + 'P';
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [activeCategory, setActiveCategory] = useState<Category>('전체');

  return (
    <div className="mx-auto max-w-7xl">
      {/* PAGE HEADER */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">지식 거래소</h1>
          <p className="mt-1 text-sm text-gray-500">
            마케팅 고민을 전문가에게 물어보고 리워드를 받으세요
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
        >
          <Plus className="h-4 w-4" />
          질문하기
        </button>
      </div>

      {/* STATS BAR */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Stat label="누적 질문" value="12,840건" />
          <span className="hidden h-8 w-px bg-gray-100 sm:block" />
          <Stat label="평균 채택률" value="94%" accent />
          <span className="hidden h-8 w-px bg-gray-100 sm:block" />
          <Stat label="평균 답변 시간" value="3.2시간" />
        </div>
      </div>

      {/* 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT — QUESTION FEED */}
        <div className="lg:col-span-2">
          {/* Filter bar */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              {FEED_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-[#0066cc] text-[#0066cc]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Category chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#0066cc] text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Question list */}
          <div className="space-y-3">
            {QUESTIONS.map((q) => (
              <QuestionRow key={q.id} question={q} />
            ))}
          </div>

          {/* Load more */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              더 많은 질문 보기
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT — SIDEBAR */}
        <div className="space-y-6">
          <TopAnswerersCard />
          <EarnCard />
          <HowItWorksCard />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-lg font-semibold ${
          accent ? 'text-[#0066cc]' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function QuestionRow({ question }: { question: Question }) {
  return (
    <div className="group flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-gray-200 hover:bg-gray-50/50">
      <div className="min-w-0 flex-1">
        {/* Badges */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[question.category]}`}
          >
            {question.category}
          </span>
          {question.adopted && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]">
              <CheckCircle2 className="h-3 w-3" />
              채택됨
            </span>
          )}
          {question.hot && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              <Flame className="h-3 w-3" />
              인기
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[17px] font-semibold leading-snug text-gray-900 group-hover:text-[#0066cc]">
          {question.title}
        </h3>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-600">{question.author}</span>
          <span className="text-gray-300">·</span>
          <span>{question.date}</span>
          <span className="text-gray-300">·</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            답변 {question.answers}개
          </span>
        </div>
      </div>

      {/* Reward badge */}
      {question.reward && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
          <Coins className="h-3.5 w-3.5" />리 {question.reward.toLocaleString('ko-KR')}P
        </span>
      )}
    </div>
  );
}

function TopAnswerersCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <Trophy className="h-4.5 w-4.5 text-amber-500" />
        <h2 className="text-base font-semibold text-gray-900">
          이번 주 인기 답변자
        </h2>
      </div>

      <div className="divide-y divide-gray-50 px-5">
        {TOP_ANSWERERS.map((a) => (
          <div key={a.rank} className="flex items-center gap-3 py-4">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_COLOR[a.rank]}`}
            >
              {a.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : a.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {a.name}
              </p>
              <p className="text-xs text-gray-500">
                답변 {a.answers}개 · 채택률 {a.adoptRate}%
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#0066cc]">
              {formatPoints(a.weeklyPoints)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#0066cc] hover:underline"
        >
          전체 랭킹 보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EarnCard() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0066cc]">
        <Coins className="h-5 w-5 text-white" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        마케팅 지식으로 수익 내기
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        답변하고 채택되면 리워드 전액 지급. 현재 대기 중인{' '}
        <span className="font-semibold text-[#0066cc]">미채택 질문 37개</span>가
        답변을 기다리고 있어요.
      </p>
      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
      >
        <PenSquare className="h-4 w-4" />
        답변자로 시작하기
      </button>
    </div>
  );
}

function HowItWorksCard() {
  const steps = [
    {
      icon: <PenSquare className="h-4 w-4 text-[#0066cc]" />,
      title: '질문 등록',
      desc: '고민을 올리고 리워드를 걸어요',
    },
    {
      icon: <Inbox className="h-4 w-4 text-[#0066cc]" />,
      title: '답변 받기',
      desc: '전문가들이 답변을 달아줘요',
    },
    {
      icon: <CheckCheck className="h-4 w-4 text-[#0066cc]" />,
      title: '채택 & 지급',
      desc: '베스트 답변 채택 시 리워드 지급',
    },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">이용 방법</h2>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                <span className="mr-1.5 text-gray-400">{i + 1}.</span>
                {s.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
