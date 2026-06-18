'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  Check,
  Loader2,
  Circle,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Eye,
} from 'lucide-react';

type Tone = 'friendly' | 'professional' | 'emotional';

const INDUSTRY_CHIPS = ['외식업', '카페', '뷰티', '교육', '의료', '기타'];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'friendly', label: '친근하게' },
  { value: 'professional', label: '전문적으로' },
  { value: 'emotional', label: '감성적으로' },
];

const GENERATION_STEPS: {
  label: string;
  status: 'done' | 'active' | 'pending';
}[] = [
  { label: '키워드 분석', status: 'done' },
  { label: '상위 포스트 패턴 학습', status: 'done' },
  { label: '초안 생성 중...', status: 'active' },
  { label: 'SEO 최적화', status: 'pending' },
  { label: '최종 검토', status: 'pending' },
];

type PostStatus = '발행 중' | '검토 중' | '초안';

interface BlogPost {
  title: string;
  keyword: string;
  rank: number;
  views: number;
  date: string;
  status: PostStatus;
}

const POSTS: BlogPost[] = [
  {
    title: '을지로 점심 맛집 추천 TOP5 — 직장인 점심 완벽 정리',
    keyword: '을지로 점심',
    rank: 2,
    views: 2341,
    date: '6/16',
    status: '발행 중',
  },
  {
    title: '강남역 카페 디저트 솔직 리뷰 (가성비 끝판왕)',
    keyword: '강남 카페',
    rank: 5,
    views: 1892,
    date: '6/14',
    status: '발행 중',
  },
  {
    title: '홍대 네일샵 추천 — 디자인 잘하는 곳 모음',
    keyword: '홍대 네일',
    rank: 3,
    views: 1654,
    date: '6/12',
    status: '발행 중',
  },
  {
    title: '성수동 브런치 카페 BEST7 주말 데이트 코스',
    keyword: '성수 브런치',
    rank: 8,
    views: 1203,
    date: '6/11',
    status: '발행 중',
  },
  {
    title: '잠실 헬스장 가격 비교 — PT 등록 전 필독',
    keyword: '잠실 헬스장',
    rank: 6,
    views: 978,
    date: '6/9',
    status: '검토 중',
  },
  {
    title: '연남동 분위기 좋은 술집 추천 리스트',
    keyword: '연남동 술집',
    rank: 4,
    views: 1547,
    date: '6/7',
    status: '발행 중',
  },
  {
    title: '신촌 피부과 추천 — 여드름 치료 후기 모음',
    keyword: '신촌 피부과',
    rank: 11,
    views: 642,
    date: '6/5',
    status: '검토 중',
  },
  {
    title: '망원동 디저트 맛집 — 인스타 감성 카페 정리',
    keyword: '망원동 디저트',
    rank: 7,
    views: 1118,
    date: '6/3',
    status: '초안',
  },
];

const SUMMARY_CARDS = [
  {
    label: '이번 달 발행',
    value: '8건',
    icon: FileText,
    accent: 'text-[#0066cc] bg-blue-50',
  },
  {
    label: '평균 키워드 순위',
    value: '4.2위',
    icon: TrendingUp,
    accent: 'text-emerald-600 bg-emerald-50',
  },
  {
    label: '누적 조회수',
    value: '28,431회',
    icon: Eye,
    accent: 'text-violet-600 bg-violet-50',
  },
];

function rankBadge(rank: number) {
  if (rank === 1) return '🥇1위';
  if (rank === 2) return '🥈2위';
  if (rank === 3) return '🥉3위';
  return `${rank}위`;
}

function statusStyle(status: PostStatus): string {
  switch (status) {
    case '발행 중':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case '검토 중':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    case '초안':
      return 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }
}

export default function AiBlogPage() {
  const [keyword, setKeyword] = useState('');
  const [activeIndustry, setActiveIndustry] = useState('외식업');
  const [tone, setTone] = useState<Tone>('friendly');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            AI 블로그 자동화
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            키워드만 입력하면 AI가 포스팅합니다
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0066cc] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
        >
          <Plus className="h-4 w-4" />새 포스트 생성
        </button>
      </div>

      {/* BLOG GENERATOR PANEL */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: input controls */}
          <div className="space-y-5">
            {/* Keyword input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                키워드 입력
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 을지로 점심 맛집"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0066cc] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20"
                />
              </div>
            </div>

            {/* Industry chips */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                업종
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_CHIPS.map((chip) => {
                  const active = chip === activeIndustry;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setActiveIndustry(chip)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#0066cc] text-white'
                          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone radio */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                톤
              </label>
              <div className="flex flex-wrap gap-4">
                {TONE_OPTIONS.map((opt) => {
                  const active = tone === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      className="inline-flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                          active
                            ? 'border-[#0066cc]'
                            : 'border-gray-300'
                        }`}
                      >
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-[#0066cc]" />
                        )}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066cc] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0058b0]"
            >
              <Sparkles className="h-4 w-4" />
              AI 포스트 생성하기
            </button>
            <p className="text-center text-xs text-gray-400">
              예상 소요: ~3분
            </p>
          </div>

          {/* RIGHT: preview / step list */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0066cc]" />
              <span className="text-sm font-medium text-gray-700">
                AI 생성 단계
              </span>
            </div>
            <ol className="space-y-3">
              {GENERATION_STEPS.map((step) => (
                <li
                  key={step.label}
                  className="flex items-center gap-3"
                >
                  {step.status === 'done' && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </span>
                  )}
                  {step.status === 'active' && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0066cc]" />
                    </span>
                  )}
                  {step.status === 'pending' && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <Circle className="h-3 w-3 text-gray-300" />
                    </span>
                  )}
                  <span
                    className={`text-sm ${
                      step.status === 'pending'
                        ? 'text-gray-400'
                        : step.status === 'active'
                          ? 'font-medium text-[#0066cc]'
                          : 'text-gray-700'
                    }`}
                  >
                    {step.label}
                    {step.status === 'done' && (
                      <span className="ml-1 text-xs text-gray-400">
                        (완료)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-md border border-dashed border-gray-200 bg-white p-4">
              <p className="text-xs leading-relaxed text-gray-400">
                생성이 완료되면 이곳에 초안 미리보기가 표시됩니다.
                키워드를 입력하고 생성을 시작해 보세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PUBLISHED POSTS TABLE */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              발행된 포스트
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              총 8개 포스트
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3">제목</th>
                <th className="px-6 py-3">키워드</th>
                <th className="px-6 py-3">순위</th>
                <th className="px-6 py-3">조회수</th>
                <th className="px-6 py-3">발행일</th>
                <th className="px-6 py-3">상태</th>
                <th className="px-6 py-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {POSTS.map((post) => (
                <tr
                  key={post.title}
                  className="transition-colors hover:bg-gray-50/60"
                >
                  <td className="max-w-xs px-6 py-4">
                    <span className="block truncate font-medium text-gray-900">
                      {post.title}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {post.keyword}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-semibold ${
                        post.rank <= 3
                          ? 'text-[#0066cc]'
                          : 'text-gray-700'
                      }`}
                    >
                      {rankBadge(post.rank)}
                    </span>
                  </td>
                  <td className="px-6 py-4 tabular-nums text-gray-700">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{post.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle(
                        post.status
                      )}`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        수정
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#0066cc] transition-colors hover:bg-blue-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        재발행
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <span className="text-xs text-gray-500">
            1–8 / 24개 표시 중
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 disabled:opacity-50"
              disabled
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-[#0066cc] px-2.5 text-sm font-medium text-white"
            >
              1
            </button>
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              2
            </button>
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              3
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PERFORMANCE SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${card.accent}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="mt-0.5 text-xl font-semibold text-gray-900">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
