'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PenLine,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  Eye,
  MapPin,
  Coins,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Upload,
  Bell,
  ChevronRight,
} from 'lucide-react';
import {
  ReceiptUploadModal,
  NewPostDrawer,
} from '@/components/modals/DashboardModals';

const statCards = [
  {
    label: '블로그 조회수',
    value: '12,847회',
    delta: '↑23% 이번 달',
    deltaPositive: true,
    icon: Eye,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0066cc]',
  },
  {
    label: '플레이스 순위',
    value: '3위',
    delta: '↑2단계 상승',
    deltaPositive: true,
    icon: MapPin,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    label: '보유 포인트',
    value: '23,400P',
    delta: '이번 달 +3,840P',
    deltaPositive: true,
    icon: Coins,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    label: '추천인 수익',
    value: '128,000원',
    valueSuffix: '/월',
    delta: '7명 활성',
    deltaPositive: true,
    icon: Users,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
];

const blogPosts = [
  { title: '을지로 점심 맛집 추천 7곳', rank: 2, views: '2,341', date: '6/16' },
  { title: '강남역 카페 디저트 베스트', rank: 5, views: '1,892', date: '6/14' },
  { title: '사장님이 알아야 할 마케팅 꿀팁', rank: 1, views: '4,521', date: '6/12' },
];

const teamBuys = [
  {
    title: '랜딩페이지 제작 3팩',
    current: 4,
    total: 5,
    discount: '67% 할인',
    deadline: '2일 남음',
    percent: 67,
  },
  {
    title: '언론보도 패키지',
    current: 2,
    total: 3,
    discount: '50% 할인',
    deadline: '4일 남음',
    percent: 50,
  },
];

const placeImprovements = [
  '대표 사진 3장 추가 시 노출 18% 상승 예상',
  '영업시간 정보 최신화 필요',
  '최근 리뷰 답글 5건 미응답',
];

const notifications = [
  { text: '팀 구매 「랜딩페이지 3팩」에 1명 더 합류했어요', time: '10분 전', dot: 'bg-[#0066cc]' },
  { text: '블로그 포스트가 키워드 1위에 올랐어요', time: '1시간 전', dot: 'bg-emerald-500' },
  { text: '영수증 리워드 320P가 적립됐어요', time: '3시간 전', dot: 'bg-amber-500' },
  { text: '추천한 사장님이 결제를 완료했어요', time: '어제', dot: 'bg-violet-500' },
  { text: '플레이스 순위가 2단계 상승했어요', time: '어제', dot: 'bg-emerald-500' },
];

function rankBadgeClass(rank: number) {
  if (rank === 1) return 'bg-[#0066cc] text-white';
  if (rank <= 3) return 'bg-blue-50 text-[#0066cc]';
  return 'bg-gray-100 text-gray-600';
}

export default function DashboardPage() {
  const router = useRouter();
  const [showReceiptUpload, setShowReceiptUpload] = useState<boolean>(false);
  const [showNewPost, setShowNewPost] = useState<boolean>(false);

  // Simple notification panel toggle for "모든 알림 보기"
  const [showAllNotifications, setShowAllNotifications] = useState<boolean>(false);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            안녕하세요, 김철수 사장님
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">2026년 6월 18일 수요일</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 hidden text-xs font-medium text-gray-400 sm:inline">
            빠른 작업
          </span>
          <button
            onClick={() => setShowNewPost(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#0058b3]"
          >
            <PenLine className="h-4 w-4" />
            블로그 쓰기
          </button>
          <button
            onClick={() => setShowReceiptUpload(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Receipt className="h-4 w-4" />
            영수증 올리기
          </button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {card.label}
                </span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-0.5">
                <span className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </span>
                {card.valueSuffix && (
                  <span className="text-sm font-medium text-gray-400">
                    {card.valueSuffix}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">
                  {card.delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI 블로그 섹션 */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  최근 발행 포스트
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  AI 블로그로 발행한 글의 성과를 확인하세요
                </p>
              </div>
              <button
                onClick={() => setShowNewPost(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066cc] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
              >
                <Plus className="h-4 w-4" />
                새 포스트
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                    <th className="px-6 py-3 font-medium">제목</th>
                    <th className="px-6 py-3 font-medium">키워드 순위</th>
                    <th className="px-6 py-3 text-right font-medium">조회수</th>
                    <th className="px-6 py-3 text-right font-medium">발행일</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map((post) => (
                    <tr
                      key={post.title}
                      onClick={() => setShowNewPost(true)}
                      className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-6 py-3.5 font-medium text-gray-800">
                        {post.title}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${rankBadgeClass(
                            post.rank
                          )}`}
                        >
                          {post.rank}위
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-700">
                        {post.views}
                      </td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-gray-500">
                        {post.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 팀 구매 진행 중 */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                팀 구매 진행 중
              </h2>
              <button
                onClick={() => router.push('/team-buy')}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-[#0066cc] hover:underline"
              >
                전체 보기
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {teamBuys.map((tb) => (
                <div key={tb.title} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {tb.title}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#0066cc]">
                        {tb.discount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Clock className="h-3.5 w-3.5" />
                      {tb.deadline}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#0066cc]"
                        style={{ width: `${(tb.current / tb.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-gray-500">
                      {tb.current}/{tb.total}명
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-6">
          {/* 플레이스 현황 */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                플레이스 현황
              </h2>
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <span className="text-sm font-medium text-gray-700">
                을지로 쌈밥 철수네
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                현재 3위
              </span>
            </div>
            <p className="mt-4 mb-2 text-xs font-medium text-gray-400">
              개선사항 {placeImprovements.length}건
            </p>
            <ul className="space-y-2">
              {placeImprovements.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 영수증 리워드 */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                영수증 리워드
              </h2>
              <Receipt className="h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">이번 달 업로드</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">12건</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">적립 포인트</p>
                <p className="mt-1 text-xl font-semibold text-[#0066cc]">
                  3,240P
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowReceiptUpload(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0066cc] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#0058b3]"
            >
              <Upload className="h-4 w-4" />
              업로드
            </button>
          </div>

          {/* 알림 */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">알림</h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                <Bell className="h-3.5 w-3.5" />
                {notifications.length}
              </span>
            </div>
            <ul className="mt-4 space-y-3.5">
              {notifications.map((n, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-gray-700">
                      {n.text}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowAllNotifications((v) => !v)}
              className="mt-4 inline-flex w-full items-center justify-center gap-0.5 text-sm font-medium text-[#0066cc] hover:underline"
            >
              {showAllNotifications ? '간략히 보기' : '모든 알림 보기'}
              <ArrowUpRight className="h-4 w-4" />
            </button>
            {showAllNotifications && (
              <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-xs font-medium text-gray-500">
                  최근 7일 알림 {notifications.length}건을 모두 표시 중입니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ReceiptUploadModal
        isOpen={showReceiptUpload}
        onClose={() => setShowReceiptUpload(false)}
      />
      <NewPostDrawer
        isOpen={showNewPost}
        onClose={() => setShowNewPost(false)}
      />
    </div>
  );
}
