'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Send,
  X,
} from 'lucide-react';
import {
  MISSION_TYPE_LABEL,
  CREATOR_TYPE_LABEL,
  CAMPAIGN_STATUS_LABEL,
  PARTICIPANT_STATUS_LABEL,
  CAMPAIGN_EDITABLE_STATUSES,
  type MissionType,
  type CreatorType,
  type CampaignStatus,
  type ParticipantStatus,
} from '@/lib/experience-campaigns';

interface CampaignDetail {
  id: string;
  store_name: string;
  title: string;
  description: string | null;
  mission_type: MissionType;
  creator_types: CreatorType[];
  mission_conditions: string;
  payback_amount: number;
  capacity: number;
  budget_total: number;
  fee_rate: number;
  fee_amount: number;
  budget_available: number;
  budget_reserved: number;
  setup_mode: 'self' | 'requested';
  status: CampaignStatus;
  reject_reason: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  nickname: string;
  creator_type: CreatorType;
  channel_handle: string;
  channel_url: string | null;
  status: ParticipantStatus;
  applied_at: string;
  content_url: string | null;
  receipt_image_url: string | null;
  receipt_matched: boolean;
  payout_amount: number | null;
  paid_at: string | null;
}

interface LedgerEntry {
  id: string;
  participant_id: string | null;
  type: 'fee' | 'reserve' | 'release' | 'payout' | 'refund';
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

interface CampaignComment {
  id: string;
  author_role: 'user' | 'admin';
  body: string;
  created_at: string;
}

interface CampaignDetailResponse {
  campaign: CampaignDetail;
  participants: Participant[];
  ledger: LedgerEntry[];
  comments: CampaignComment[];
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

const PARTICIPANT_BADGE: Record<ParticipantStatus, string> = {
  applied: 'bg-gray-100 text-gray-600',
  approved: 'bg-accent-bg text-primary-dark',
  content_submitted: 'bg-amber-50 text-amber-700',
  verifying: 'bg-purple-50 text-purple-700',
  verified: 'bg-green-50 text-green-700',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

function formatWon(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ExperienceCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- campaignId 변경 시에만 재조회
  }, [campaignId]);

  async function loadDetail() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/experience/campaigns/${campaignId}`);
      if (res.status === 404) throw new Error('캠페인을 찾을 수 없습니다');
      if (res.status === 403) throw new Error('본인 캠페인만 확인할 수 있습니다');
      if (!res.ok) throw new Error('캠페인 정보를 불러오지 못했습니다');
      const json = (await res.json()) as CampaignDetailResponse;
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '캠페인 정보를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          {loadError ?? '캠페인 정보를 불러오지 못했습니다'}
        </div>
      </div>
    );
  }

  const { campaign, participants, comments } = data;
  const isEditable = CAMPAIGN_EDITABLE_STATUSES.includes(campaign.status);

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500">{campaign.store_name}</p>
          <h1 className="mt-0.5 text-2xl font-semibold text-gray-900">{campaign.title}</h1>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[campaign.status]}`}
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
            className="inline-flex items-center rounded-md bg-accent-bg px-2 py-0.5 text-xs font-medium text-primary-dark"
          >
            {CREATOR_TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      {campaign.status === 'pending_setup' && (
        <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-700">
          세팅 요청 처리 중입니다. 관리자가 상담 후 캠페인 세부 조건을 채워 승인 요청 상태로 전환합니다.
        </div>
      )}

      {campaign.status === 'rejected' && campaign.reject_reason && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">반려 사유</p>
          <p className="mt-1">{campaign.reject_reason}</p>
        </div>
      )}

      {campaign.status === 'change_requested' && (
        <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">관리자가 수정을 요청했습니다</p>
          {campaign.reject_reason && (
            <p className="mt-1 text-sm text-orange-700">{campaign.reject_reason}</p>
          )}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="mt-3 inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-primary-hover"
          >
            수정하기
          </button>
        </div>
      )}

      {isEditable && campaign.status !== 'change_requested' && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            캠페인 수정하기
          </button>
        </div>
      )}

      {/* 예산 카드 */}
      <section className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4.5 w-4.5 text-primary-dark" />
          <h2 className="text-base font-semibold text-gray-900">예산 현황</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <BudgetStat label="총 예산" value={formatWon(campaign.budget_total)} />
          <BudgetStat label={`수수료 (${campaign.fee_rate}%)`} value={formatWon(campaign.fee_amount)} />
          <BudgetStat label="가용 예산" value={formatWon(campaign.budget_available)} highlight />
          <BudgetStat label="예약 중" value={formatWon(campaign.budget_reserved)} />
        </div>
      </section>

      {/* 참여자 테이블 */}
      <section className="mt-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900">참여자 ({participants.length}명)</h2>
        </div>
        {participants.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">아직 신청한 크리에이터가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-6 py-3">닉네임</th>
                  <th className="px-6 py-3">채널</th>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">콘텐츠</th>
                  <th className="px-6 py-3">영수증</th>
                  <th className="px-6 py-3">대조</th>
                  <th className="px-6 py-3 text-right">지급액</th>
                  <th className="px-6 py-3 text-right">지급일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.nickname}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                          {CREATOR_TYPE_LABEL[p.creator_type]}
                        </span>
                        <span>{p.channel_handle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PARTICIPANT_BADGE[p.status]}`}
                      >
                        {PARTICIPANT_STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.content_url ? (
                        <a
                          href={p.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-dark hover:underline"
                        >
                          링크 확인
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.receipt_image_url ? (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(p.receipt_image_url)}
                          className="block h-10 w-10 overflow-hidden rounded-md border border-gray-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- 원본 크기 확인 위해 img 사용 */}
                          <img src={p.receipt_image_url} alt="영수증" className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.receipt_image_url ? (
                        p.receipt_matched ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-gray-400" />
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {p.payout_amount ? formatWon(p.payout_amount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatDateTime(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 코멘트 스레드 */}
      <CommentThread campaignId={campaignId} initialComments={comments} />

      {showEdit && (
        <EditCampaignModal
          campaign={campaign}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setData((prev) => (prev ? { ...prev, campaign: updated } : prev));
            setShowEdit(false);
          }}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 라이트박스 원본 확대 */}
          <img
            src={lightboxUrl}
            alt="영수증 확대"
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/experience"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
    >
      <ArrowLeft className="h-4 w-4" />
      목록으로
    </Link>
  );
}

function BudgetStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${highlight ? 'text-primary-dark' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function CommentThread({
  campaignId,
  initialComments,
}: {
  campaignId: string;
  initialComments: CampaignComment[];
}) {
  const [comments, setComments] = useState<CampaignComment[]>(initialComments);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/experience/campaigns/${campaignId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '코멘트 등록에 실패했습니다');
      setComments((prev) => [...prev, data as CampaignComment]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '코멘트 등록에 실패했습니다');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">코멘트</h2>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto p-6">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">아직 등록된 코멘트가 없습니다</p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg p-3 text-sm ${
              c.author_role === 'admin' ? 'bg-orange-50 text-orange-900' : 'bg-gray-50 text-gray-700'
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{c.author_role === 'admin' ? '관리자' : '나'}</span>
              <span className="text-gray-400">{formatDateTime(c.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-gray-100 p-4">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="문의하거나 요청사항을 남겨주세요"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          전송
        </button>
      </form>
      {error && <p className="px-4 pb-4 text-xs text-red-600">{error}</p>}
    </section>
  );
}

const MISSION_TYPES: MissionType[] = ['visit', 'press', 'provided', 'receipt_review'];
const CREATOR_TYPES_ALL: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok'];

function EditCampaignModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: CampaignDetail;
  onClose: () => void;
  onSaved: (updated: CampaignDetail) => void;
}) {
  const [form, setForm] = useState({
    store_name: campaign.store_name,
    title: campaign.title,
    description: campaign.description ?? '',
    mission_type: campaign.mission_type,
    creator_types: campaign.creator_types,
    mission_conditions: campaign.mission_conditions,
    payback_amount: String(campaign.payback_amount),
    capacity: String(campaign.capacity),
    budget_total: String(campaign.budget_total),
    start_date: campaign.start_date ?? '',
    end_date: campaign.end_date ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCreatorType(type: CreatorType) {
    setForm((prev) => ({
      ...prev,
      creator_types: prev.creator_types.includes(type)
        ? prev.creator_types.filter((t) => t !== type)
        : [...prev.creator_types, type],
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/experience/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: form.store_name,
          title: form.title,
          description: form.description || undefined,
          mission_type: form.mission_type,
          creator_types: form.creator_types,
          mission_conditions: form.mission_conditions,
          payback_amount: Number(form.payback_amount),
          capacity: Number(form.capacity),
          budget_total: Number(form.budget_total),
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '캠페인 수정에 실패했습니다');
      onSaved(data as CampaignDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : '캠페인 수정에 실패했습니다');
    } finally {
      setSaving(false);
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
          <h2 className="text-base font-semibold text-gray-900">캠페인 수정</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">가게 이름</label>
            <input
              type="text"
              value={form.store_name}
              onChange={(e) => setForm((p) => ({ ...p, store_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">캠페인 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">미션 유형</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MISSION_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    form.mission_type === type
                      ? 'border-primary-dark bg-accent-bg text-primary-dark'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_mission_type"
                    className="accent-primary-dark"
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CREATOR_TYPES_ALL.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    form.creator_types.includes(type)
                      ? 'border-primary-dark bg-accent-bg text-primary-dark'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-primary-dark"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">페이백 금액</label>
              <input
                type="number"
                min={0}
                value={form.payback_amount}
                onChange={(e) => setForm((p) => ({ ...p, payback_amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">모집 인원</label>
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">시작일 (선택)</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">종료일 (선택)</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-ink transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
