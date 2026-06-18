'use client';

import { useState } from 'react';
import {
  Plus,
  Users,
  Calendar,
  ClipboardList,
  Pencil,
  UserPlus,
  ArrowLeftRight,
  Instagram,
  FileText,
} from 'lucide-react';
import {
  NewCampaignModal,
  ApplicantsDrawer,
  RecruitModal,
  ExchangeProposalModal,
} from '@/components/modals/ExperienceModals';

type TabKey = 'active' | 'completed' | 'exchange' | 'pool';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: '진행 중' },
  { key: 'completed', label: '완료' },
  { key: 'exchange', label: '품앗이' },
  { key: 'pool', label: '크리에이터 풀' },
];

interface Campaign {
  id: string;
  title: string;
  status: 'recruiting' | 'waiting';
  recruited: number;
  capacity: number;
  experienceDate: string;
  conditions: string[];
}

const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    title: '을지로 쌈밥 런치 체험',
    status: 'recruiting',
    recruited: 3,
    capacity: 5,
    experienceDate: '2026.06.25',
    conditions: ['블로그 1건', '인스타 1건'],
  },
  {
    id: 'c2',
    title: '주말 저녁 코스 메뉴 체험',
    status: 'waiting',
    recruited: 1,
    capacity: 3,
    experienceDate: '2026.07.05',
    conditions: ['인스타 1건'],
  },
];

interface Creator {
  id: string;
  nickname: string;
  followers: number;
  category: string;
  matchScore: number;
  color: string;
}

const CREATORS: Creator[] = [
  { id: 'k1', nickname: '이한별', followers: 12400, category: '맛집탐방', matchScore: 94, color: '#0066cc' },
  { id: 'k2', nickname: '서울맛집탐험가', followers: 8230, category: '한식', matchScore: 91, color: '#16a34a' },
  { id: 'k3', nickname: '홍대미식가', followers: 15100, category: '카페/맛집', matchScore: 88, color: '#9333ea' },
  { id: 'k4', nickname: '먹스타그램', followers: 6800, category: '외식업', matchScore: 85, color: '#ea580c' },
  { id: 'k5', nickname: '음식사진작가김', followers: 22000, category: '푸드포토', matchScore: 82, color: '#dc2626' },
  { id: 'k6', nickname: '동네맛집지도', followers: 4500, category: '로컬맛집', matchScore: 79, color: '#0891b2' },
];

interface ExchangeRow {
  id: string;
  partner: string;
  type: string;
  status: '진행 중' | '예정' | '검토 중';
  scheduledDate: string;
}

const EXCHANGES: ExchangeRow[] = [
  { id: 'e1', partner: '연남동 베이글베이커리', type: '인스타 상호 노출', status: '진행 중', scheduledDate: '2026.06.21' },
  { id: 'e2', partner: '망원 수제버거하우스', type: '블로그 교차 리뷰', status: '예정', scheduledDate: '2026.06.28' },
  { id: 'e3', partner: '합정 디저트카페 모모', type: '스토리 공유', status: '검토 중', scheduledDate: '2026.07.02' },
];

function formatFollowers(n: number): string {
  return n.toLocaleString('ko-KR') + '명';
}

export default function ExperiencePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showNewCampaign, setShowNewCampaign] = useState<boolean>(false);
  const [showApplicants, setShowApplicants] = useState<{
    open: boolean;
    campaign: Campaign | null;
  }>({ open: false, campaign: null });
  const [showRecruit, setShowRecruit] = useState<{
    open: boolean;
    creator: Creator | null;
  }>({ open: false, creator: null });
  const [showExchange, setShowExchange] = useState<boolean>(false);

  return (
    <div className="mx-auto max-w-7xl">
      {/* PAGE HEADER */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">미니 체험단</h1>
          <p className="mt-1 text-sm text-gray-500">
            크리에이터를 매칭하고 품앗이로 무료 홍보를
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewCampaign(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
        >
          <Plus className="h-4 w-4" />
          새 체험단 만들기
        </button>
      </div>

      {/* TABS */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
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

      {activeTab === 'active' && (
        <div className="space-y-8">
          {/* 진행 중인 캠페인 */}
          <section>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {CAMPAIGNS.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onViewApplicants={() =>
                    setShowApplicants({ open: true, campaign: c })
                  }
                  onEdit={() => alert('수정 기능 준비 중')}
                />
              ))}
            </div>
          </section>

          {/* 크리에이터 추천 */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                내 가게와 맞는 크리에이터
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                업종과 지역 데이터를 기반으로 매칭 점수가 높은 순으로 추천합니다
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {CREATORS.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  onRecruit={() => setShowRecruit({ open: true, creator })}
                />
              ))}
            </div>
          </section>

          {/* 품앗이 현황 */}
          <section>
            <ExchangePanel onPropose={() => setShowExchange(true)} />
          </section>
        </div>
      )}

      {activeTab === 'completed' && (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6 text-gray-400" />}
          title="완료된 체험단이 없습니다"
          description="진행 중인 캠페인이 마무리되면 이곳에서 결과 리포트를 확인할 수 있습니다."
        />
      )}

      {activeTab === 'exchange' && (
        <div className="space-y-6">
          <ExchangePanel onPropose={() => setShowExchange(true)} />
        </div>
      )}

      {activeTab === 'pool' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CREATORS.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onRecruit={() => setShowRecruit({ open: true, creator })}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      <NewCampaignModal
        isOpen={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
      />
      <ApplicantsDrawer
        isOpen={showApplicants.open}
        onClose={() => setShowApplicants({ open: false, campaign: null })}
        campaign={showApplicants.campaign}
      />
      <RecruitModal
        isOpen={showRecruit.open}
        onClose={() => setShowRecruit({ open: false, creator: null })}
        creator={showRecruit.creator}
      />
      <ExchangeProposalModal
        isOpen={showExchange}
        onClose={() => setShowExchange(false)}
      />
    </div>
  );
}

function CampaignCard({
  campaign,
  onViewApplicants,
  onEdit,
}: {
  campaign: Campaign;
  onViewApplicants: () => void;
  onEdit: () => void;
}) {
  const pct = Math.round((campaign.recruited / campaign.capacity) * 100);
  const isRecruiting = campaign.status === 'recruiting';

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">
          {campaign.title}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isRecruiting
              ? 'bg-amber-50 text-amber-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          <span className={isRecruiting ? 'text-amber-500' : 'text-blue-500'}>
            ●
          </span>
          {isRecruiting ? '모집 중' : '대기 중'}
        </span>
      </div>

      {/* 모집 현황 */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Users className="h-4 w-4" />
            모집 현황
          </span>
          <span className="font-semibold text-gray-900">
            {campaign.recruited}/{campaign.capacity}명
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#0066cc] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 메타 정보 */}
      <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="h-4 w-4" />
            체험일
          </dt>
          <dd className="font-medium text-gray-900">
            {campaign.experienceDate}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-gray-500">
            <ClipboardList className="h-4 w-4" />
            조건
          </dt>
          <dd className="flex flex-wrap justify-end gap-1.5">
            {campaign.conditions.map((cond) => (
              <span
                key={cond}
                className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {cond.startsWith('블로그') ? (
                  <FileText className="h-3 w-3" />
                ) : (
                  <Instagram className="h-3 w-3" />
                )}
                {cond}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {/* 액션 */}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onViewApplicants}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0066cc] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0058b0]"
        >
          <Users className="h-4 w-4" />
          지원자 보기
        </button>
        {isRecruiting && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            캠페인 수정
          </button>
        )}
      </div>
    </div>
  );
}

function CreatorCard({
  creator,
  onRecruit,
}: {
  creator: Creator;
  onRecruit: () => void;
}) {
  const initial = creator.nickname.charAt(0);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ backgroundColor: creator.color }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {creator.nickname}
          </p>
          <p className="text-xs text-gray-500">
            팔로워 {formatFollowers(creator.followers)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
          {creator.category}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">매칭 점수</span>
          <span className="font-semibold text-[#0066cc]">
            {creator.matchScore}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#0066cc]"
            style={{ width: `${creator.matchScore}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRecruit}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0066cc] bg-white px-3 py-2 text-sm font-medium text-[#0066cc] transition-colors hover:bg-blue-50"
      >
        <UserPlus className="h-4 w-4" />
        섭외하기
      </button>
    </div>
  );
}

function ExchangePanel({ onPropose }: { onPropose: () => void }) {
  const statusStyle: Record<ExchangeRow['status'], string> = {
    '진행 중': 'bg-green-50 text-green-700',
    예정: 'bg-blue-50 text-blue-700',
    '검토 중': 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <ArrowLeftRight className="h-4.5 w-4.5 text-[#0066cc]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">품앗이 현황</h2>
            <p className="text-sm text-gray-500">현재 3건 교환 진행 중</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPropose}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          교환 제안
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
              <th className="px-6 py-3">상대 가게</th>
              <th className="px-6 py-3">교환 유형</th>
              <th className="px-6 py-3">상태</th>
              <th className="px-6 py-3 text-right">예정일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {EXCHANGES.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {row.partner}
                </td>
                <td className="px-6 py-4 text-gray-600">{row.type}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                  {row.scheduledDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}
