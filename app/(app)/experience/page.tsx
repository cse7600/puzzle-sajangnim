'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Plus, Users, Wallet, ClipboardList, X } from 'lucide-react';
import {
  MISSION_TYPE_LABEL,
  CREATOR_TYPE_LABEL,
  CAMPAIGN_STATUS_LABEL,
  DEFAULT_FEE_RATE,
  type MissionType,
  type CreatorType,
  type CampaignStatus,
} from '@/lib/experience-campaigns';

const PRIMARY = '#0066cc';

interface ParticipantStats {
  applied: number;
  approved: number;
  paid: number;
}

interface CampaignListItem {
  id: string;
  store_name: string;
  title: string;
  mission_type: MissionType;
  creator_types: CreatorType[];
  payback_amount: number;
  capacity: number;
  budget_total: number;
  fee_rate: number;
  fee_amount: number;
  budget_available: number;
  budget_reserved: number;
  setup_mode: 'self' | 'requested';
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  participant_stats: ParticipantStats;
}

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_setup: 'bg-purple-50 text-purple-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  change_requested: 'bg-orange-50 text-orange-700',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  closed: 'bg-gray-100 text-gray-600',
  settled: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
};

function formatWon(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

const MISSION_TYPES: MissionType[] = ['visit', 'press', 'provided', 'receipt_review'];
const CREATOR_TYPES: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok'];
const MIN_CONDITIONS_LENGTH = 10;
const REQUESTED_SETUP_PLACEHOLDER = '세팅 요청 - 지급 조건은 관리자가 상담 후 채워드립니다';

interface CampaignFormState {
  store_name: string;
  title: string;
  description: string;
  mission_type: MissionType;
  creator_types: CreatorType[];
  mission_conditions: string;
  payback_amount: string;
  capacity: string;
  budget_total: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: CampaignFormState = {
  store_name: '',
  title: '',
  description: '',
  mission_type: 'visit',
  creator_types: [],
  mission_conditions: '',
  payback_amount: '',
  capacity: '',
  budget_total: '',
  start_date: '',
  end_date: '',
};

export default function ExperiencePage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/experience/campaigns');
      if (!res.ok) throw new Error('failed');
      const data = (await res.json()) as CampaignListItem[];
      setCampaigns(data);
    } catch {
      setLoadError('한끼 체험단 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(campaign: CampaignListItem) {
    setCampaigns((prev) => [campaign, ...prev]);
    setShowNewCampaign(false);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">한끼 체험단</h1>
          <p className="mt-1 text-sm text-gray-500">
            크리에이터가 방문해서 식사하고 후기 남기면, 검증 후 자동으로 페이백
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewCampaign(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
        >
          <Plus className="h-4 w-4" />
          새 캠페인 만들기
        </button>
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && loadError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {!loading && !loadError && campaigns.length === 0 && (
        <EmptyState onCreate={() => setShowNewCampaign(true)} />
      )}

      {!loading && !loadError && campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {showNewCampaign && (
        <NewCampaignModal onClose={() => setShowNewCampaign(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="h-4 w-2/3 rounded bg-gray-100" />
          <div className="mt-4 h-2 w-full rounded bg-gray-100" />
          <div className="mt-6 h-2 w-full rounded bg-gray-100" />
          <div className="mt-2 h-2 w-3/4 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <ClipboardList className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">진행 중인 한끼 체험단이 없습니다</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
        새 캠페인을 만들면 관리자 승인 후 크리에이터 신청을 받을 수 있습니다.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0066cc] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0058b0]"
      >
        <Plus className="h-4 w-4" />첫 캠페인 만들기
      </button>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  const recruitPct = Math.min(
    100,
    Math.round((campaign.participant_stats.approved / campaign.capacity) * 100)
  );
  const budgetPct =
    campaign.budget_total > 0
      ? Math.min(100, Math.round((campaign.budget_available / campaign.budget_total) * 100))
      : 0;

  return (
    <Link
      href={`/experience/${campaign.id}`}
      className="block rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{campaign.store_name}</p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900">{campaign.title}</h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[campaign.status]}`}
        >
          {CAMPAIGN_STATUS_LABEL[campaign.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
          {MISSION_TYPE_LABEL[campaign.mission_type]}
        </span>
        {campaign.creator_types.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0066cc]"
          >
            {CREATOR_TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Users className="h-4 w-4" />
            모집 현황
          </span>
          <span className="font-semibold text-gray-900">
            {campaign.participant_stats.approved}/{campaign.capacity}명
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-[#0066cc] transition-all" style={{ width: `${recruitPct}%` }} />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Wallet className="h-4 w-4" />
            예산 현황
          </span>
          <span className="font-semibold text-gray-900">
            {formatWon(campaign.budget_available)} / {formatWon(campaign.budget_total)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${budgetPct}%` }} />
        </div>
      </div>

      <dl className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
        <dt className="text-gray-500">페이백 단가</dt>
        <dd className="font-semibold text-gray-900">{formatWon(campaign.payback_amount)}</dd>
      </dl>
    </Link>
  );
}

function NewCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (campaign: CampaignListItem) => void;
}) {
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState<'self' | 'requested' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const budgetTotalNumber = Number(form.budget_total) || 0;
  const feePreview = Math.round((budgetTotalNumber * DEFAULT_FEE_RATE) / 100);
  const availablePreview = budgetTotalNumber - feePreview;

  function toggleCreatorType(type: CreatorType) {
    setForm((prev) => ({
      ...prev,
      creator_types: prev.creator_types.includes(type)
        ? prev.creator_types.filter((t) => t !== type)
        : [...prev.creator_types, type],
    }));
  }

  function buildRequestPayload(setupMode: 'self' | 'requested') {
    if (setupMode === 'self') {
      return {
        store_name: form.store_name,
        title: form.title,
        description: form.description || undefined,
        mission_type: form.mission_type,
        creator_types: form.creator_types,
        mission_conditions: form.mission_conditions,
        payback_amount: Number(form.payback_amount),
        capacity: Number(form.capacity),
        budget_total: Number(form.budget_total),
        setup_mode: 'self',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
    }

    // 세팅 요청 — 최소 유효값만 채워 validateCampaignCreateInput을 통과시키고
    // 나머지 세부 항목은 관리자가 상담 후 채운다.
    const budgetTotal = Number(form.budget_total) || 0;
    const capacity = Number(form.capacity) || 1;
    const payback =
      Number(form.payback_amount) || Math.max(1, Math.floor(budgetTotal / capacity));

    return {
      store_name: form.store_name,
      title: form.title,
      description: form.description || undefined,
      mission_type: form.mission_type || 'visit',
      creator_types: form.creator_types.length > 0 ? form.creator_types : ['blog'],
      mission_conditions:
        form.mission_conditions.trim().length >= MIN_CONDITIONS_LENGTH
          ? form.mission_conditions
          : REQUESTED_SETUP_PLACEHOLDER,
      payback_amount: payback,
      capacity,
      budget_total: budgetTotal,
      setup_mode: 'requested',
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
  }

  async function submit(setupMode: 'self' | 'requested', e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.store_name.trim()) return setError('가게 이름을 입력해주세요');
    if (!form.title.trim()) return setError('캠페인 제목을 입력해주세요');
    if (!form.budget_total || Number(form.budget_total) <= 0) {
      return setError('예산을 올바르게 입력해주세요');
    }
    if (setupMode === 'self') {
      if (form.creator_types.length === 0) return setError('참여 크리에이터 유형을 하나 이상 선택해주세요');
      if (form.mission_conditions.trim().length < MIN_CONDITIONS_LENGTH) {
        return setError('지급 조건은 10자 이상 작성해주세요');
      }
      if (!form.payback_amount || Number(form.payback_amount) <= 0) {
        return setError('페이백 금액을 올바르게 입력해주세요');
      }
      if (!form.capacity || Number(form.capacity) <= 0) {
        return setError('모집 인원을 올바르게 입력해주세요');
      }
      if (Number(form.budget_total) < Number(form.payback_amount) * Number(form.capacity)) {
        return setError('예산은 최소 (페이백 금액 × 모집 인원) 이상이어야 합니다');
      }
    }

    setSubmitting(setupMode);
    try {
      const res = await fetch('/api/experience/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestPayload(setupMode)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '캠페인 등록에 실패했습니다');
      onCreated(data as CampaignListItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : '캠페인 등록에 실패했습니다');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">새 캠페인 만들기</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">가게 이름</label>
            <input
              type="text"
              value={form.store_name}
              onChange={(e) => setForm((p) => ({ ...p, store_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              placeholder="예) 을지로 쌈밥집"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">캠페인 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              placeholder="예) 을지로 쌈밥 런치 체험단 모집"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">미션 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {MISSION_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    form.mission_type === type
                      ? 'border-[#0066cc] bg-blue-50 text-[#0066cc]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="mission_type"
                    className="accent-[#0066cc]"
                    checked={form.mission_type === type}
                    onChange={() => setForm((p) => ({ ...p, mission_type: type }))}
                  />
                  {MISSION_TYPE_LABEL[type]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">참여 크리에이터 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {CREATOR_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    form.creator_types.includes(type)
                      ? 'border-[#0066cc] bg-blue-50 text-[#0066cc]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-[#0066cc]"
                    checked={form.creator_types.includes(type)}
                    onChange={() => toggleCreatorType(type)}
                  />
                  {CREATOR_TYPE_LABEL[type]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">지급 조건</label>
            <textarea
              value={form.mission_conditions}
              onChange={(e) => setForm((p) => ({ ...p, mission_conditions: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              placeholder="지급 조건을 명확히 안내하세요 (예: 방문 후 7일 이내 블로그 게시, 사진 5장 이상 포함)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">페이백 금액</label>
              <input
                type="number"
                min={0}
                value={form.payback_amount}
                onChange={(e) => setForm((p) => ({ ...p, payback_amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
                placeholder="원"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">모집 인원</label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
                placeholder="명"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">총 예산</label>
            <input
              type="number"
              min={0}
              value={form.budget_total}
              onChange={(e) => setForm((p) => ({ ...p, budget_total: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              placeholder="원"
            />
            {budgetTotalNumber > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                수수료 {DEFAULT_FEE_RATE}% ({formatWon(feePreview)}) 제외 후 실제 운영 예산{' '}
                <span className="font-medium text-gray-700">{formatWon(availablePreview)}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">시작일 (선택)</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">종료일 (선택)</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066cc] focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={(e) => submit('self', e)}
            className="w-full rounded-lg bg-[#0066cc] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0058b0] disabled:opacity-60"
          >
            {submitting === 'self' ? '등록 중...' : '직접 등록 완료'}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={(e) => submit('requested', e)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {submitting === 'requested' ? '요청 중...' : '세팅 요청하기 — 관리자가 대신 채워드려요'}
          </button>
        </div>
      </div>
    </div>
  );
}
