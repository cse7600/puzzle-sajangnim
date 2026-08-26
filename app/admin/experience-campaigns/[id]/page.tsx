'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AdminExperienceCampaignDetail,
  AdminExperienceParticipant,
  CAMPAIGN_STATUS_STYLE,
  PARTICIPANT_STATUS_STYLE,
} from '@/components/admin/experience-campaign-types'
import {
  CAMPAIGN_STATUS_LABEL,
  CREATOR_TYPE_LABEL,
  CampaignStatus,
  CreatorType,
  MISSION_TYPE_LABEL,
  MissionType,
  PARTICIPANT_STATUS_LABEL,
} from '@/lib/experience-campaigns'

const ADMIN_SETUP_EDITABLE_STATUSES: CampaignStatus[] = ['draft', 'pending_setup', 'change_requested']
const APPROVABLE_STATUSES: CampaignStatus[] = ['pending_setup', 'pending_approval']
const REVIEWABLE_STATUSES: CampaignStatus[] = ['pending_setup', 'pending_approval']
const CLOSABLE_STATUSES: CampaignStatus[] = ['active', 'paused']

const MISSION_TYPES: MissionType[] = ['visit', 'press', 'provided', 'receipt_review']
const CREATOR_TYPES: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok']

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function ReasonDialog({
  label,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  label: string
  confirmLabel: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="rounded-[11px] border border-[#e0e0e0] bg-[#f5f5f7] p-3 space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={label}
        rows={2}
        className="w-full rounded-[7px] border border-[#e0e0e0] px-2 py-1.5 text-[12px] outline-none focus:border-[#0066cc]"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason.trim())}
          className="rounded-[7px] bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-[12px] text-[#6e6e73]">
          취소
        </button>
      </div>
    </div>
  )
}

interface SetupFormValues {
  store_name: string
  naver_place_id: string
  title: string
  description: string
  mission_type: MissionType
  creator_types: CreatorType[]
  mission_conditions: string
  payback_amount: string
  capacity: string
  budget_total: string
  start_date: string
  end_date: string
}

function toFormValues(campaign: AdminExperienceCampaignDetail['campaign']): SetupFormValues {
  return {
    store_name: campaign.store_name,
    naver_place_id: campaign.naver_place_id ?? '',
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
  }
}

function SetupForm({
  campaign,
  onSave,
  saving,
}: {
  campaign: AdminExperienceCampaignDetail['campaign']
  onSave: (values: SetupFormValues) => void
  saving: boolean
}) {
  const [values, setValues] = useState<SetupFormValues>(() => toFormValues(campaign))

  function toggleCreatorType(type: CreatorType) {
    setValues((prev) => ({
      ...prev,
      creator_types: prev.creator_types.includes(type)
        ? prev.creator_types.filter((t) => t !== type)
        : [...prev.creator_types, type],
    }))
  }

  return (
    <div className="rounded-[16px] border border-[#e0e0e0] bg-white p-5 space-y-4">
      <p className="text-[14px] font-semibold text-[#1d1d1f]">캠페인 세팅</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-[#6e6e73]">
          가게 이름
          <input
            value={values.store_name}
            onChange={(e) => setValues({ ...values, store_name: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
        <label className="text-[12px] text-[#6e6e73]">
          네이버 플레이스 ID
          <input
            value={values.naver_place_id}
            onChange={(e) => setValues({ ...values, naver_place_id: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
      </div>
      <label className="block text-[12px] text-[#6e6e73]">
        캠페인 제목
        <input
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
        />
      </label>
      <label className="block text-[12px] text-[#6e6e73]">
        설명
        <textarea
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-[#6e6e73]">
          미션 유형
          <select
            value={values.mission_type}
            onChange={(e) => setValues({ ...values, mission_type: e.target.value as MissionType })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          >
            {MISSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {MISSION_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <div className="text-[12px] text-[#6e6e73]">
          참여 크리에이터 유형
          <div className="mt-1 flex flex-wrap gap-2">
            {CREATOR_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => toggleCreatorType(type)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                  values.creator_types.includes(type)
                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]'
                    : 'bg-white text-[#6e6e73] border-[#e0e0e0]'
                }`}
              >
                {CREATOR_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="block text-[12px] text-[#6e6e73]">
        지급 조건
        <textarea
          value={values.mission_conditions}
          onChange={(e) => setValues({ ...values, mission_conditions: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
        />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-[12px] text-[#6e6e73]">
          페이백 금액
          <input
            type="number"
            value={values.payback_amount}
            onChange={(e) => setValues({ ...values, payback_amount: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
        <label className="text-[12px] text-[#6e6e73]">
          모집 인원
          <input
            type="number"
            value={values.capacity}
            onChange={(e) => setValues({ ...values, capacity: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
        <label className="text-[12px] text-[#6e6e73]">
          총 예산
          <input
            type="number"
            value={values.budget_total}
            onChange={(e) => setValues({ ...values, budget_total: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-[#6e6e73]">
          시작일
          <input
            type="date"
            value={values.start_date}
            onChange={(e) => setValues({ ...values, start_date: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
        <label className="text-[12px] text-[#6e6e73]">
          종료일
          <input
            type="date"
            value={values.end_date}
            onChange={(e) => setValues({ ...values, end_date: e.target.value })}
            className="mt-1 w-full rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(values)}
        className="rounded-[9999px] bg-[#0066cc] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors disabled:opacity-50"
      >
        {saving ? '저장 중...' : '세팅 저장'}
      </button>
    </div>
  )
}

function ReceiptThumbnail({ url, onOpen }: { url: string; onOpen: (url: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(url)} className="block">
      <img src={url} alt="영수증" className="h-12 w-12 rounded-[7px] object-cover border border-[#e0e0e0]" />
    </button>
  )
}

function ParticipantRow({
  participant,
  autoPayout,
  onAction,
  onOpenImage,
  busy,
}: {
  participant: AdminExperienceParticipant
  autoPayout: boolean
  onAction: (action: string, extra?: Record<string, string>) => void
  onOpenImage: (url: string) => void
  busy: boolean
}) {
  const [mode, setMode] = useState<'idle' | 'reject' | 'expire' | 'verify'>('idle')
  const [note, setNote] = useState('')

  return (
    <tr className="border-b border-[#e0e0e0] last:border-0 align-top">
      <td className="px-3 py-3">
        <p className="font-medium text-[#1d1d1f]">{participant.nickname}</p>
        <p className="text-[11px] text-[#6e6e73] mt-0.5">
          {CREATOR_TYPE_LABEL[participant.creator_type]} · {participant.channel_handle}
        </p>
        <p className="text-[11px] text-[#a1a1a6] mt-0.5">{participant.phone}</p>
      </td>
      <td className="px-3 py-3">
        {participant.content_url ? (
          <a href={participant.content_url} target="_blank" rel="noreferrer" className="text-[#0066cc] hover:underline">
            콘텐츠 링크
          </a>
        ) : (
          <span className="text-[#a1a1a6]">-</span>
        )}
        {participant.content_match_snippet && (
          <p className="text-[11px] text-[#6e6e73] mt-1 line-clamp-2 max-w-[220px]">
            &quot;{participant.content_match_snippet}&quot;
          </p>
        )}
      </td>
      <td className="px-3 py-3">
        {participant.receipt_image_url ? (
          <div>
            <ReceiptThumbnail url={participant.receipt_image_url} onOpen={onOpenImage} />
            <p className={`text-[11px] mt-1 ${participant.receipt_matched ? 'text-green-700' : 'text-red-600'}`}>
              {participant.receipt_matched ? '영수증 대조 일치' : '영수증 대조 불일치'}
            </p>
          </div>
        ) : (
          <span className="text-[#a1a1a6]">-</span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className={`rounded-[9999px] px-2 py-0.5 text-[11px] font-medium ${PARTICIPANT_STATUS_STYLE[participant.status]}`}>
          {PARTICIPANT_STATUS_LABEL[participant.status]}
        </span>
        {participant.reject_reason && (
          <p className="text-[11px] text-[#a1a1a6] mt-1 max-w-[160px]">{participant.reject_reason}</p>
        )}
      </td>
      <td className="px-3 py-3 min-w-[180px]">
        {mode === 'reject' && (
          <ReasonDialog
            label="반려 사유"
            confirmLabel="반려"
            onConfirm={(reason) => {
              onAction('reject', { reason })
              setMode('idle')
            }}
            onCancel={() => setMode('idle')}
          />
        )}
        {mode === 'expire' && (
          <ReasonDialog
            label="만료 사유(선택)"
            confirmLabel="만료 처리"
            onConfirm={(reason) => {
              onAction('expire', { reason })
              setMode('idle')
            }}
            onCancel={() => setMode('idle')}
          />
        )}
        {mode === 'verify' && (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="검증 메모(선택)"
              rows={2}
              className="w-full rounded-[7px] border border-[#e0e0e0] px-2 py-1.5 text-[12px] outline-none focus:border-[#0066cc]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onAction('verify', { note })
                  setMode('idle')
                }}
                className="rounded-[7px] bg-green-600 px-3 py-1.5 text-[12px] font-medium text-white"
              >
                검증 완료
              </button>
              <button type="button" onClick={() => setMode('idle')} className="text-[12px] text-[#6e6e73]">
                취소
              </button>
            </div>
          </div>
        )}
        {mode === 'idle' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {participant.status === 'applied' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction('approve')}
                  className="rounded-[7px] bg-[#0066cc] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  승인
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('reject')}
                  className="rounded-[7px] border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 disabled:opacity-40"
                >
                  반려
                </button>
              </>
            )}
            {participant.status === 'approved' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('expire')}
                  className="rounded-[7px] border border-[#e0e0e0] px-2.5 py-1 text-[11px] font-medium text-[#6e6e73] disabled:opacity-40"
                >
                  만료
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('reject')}
                  className="rounded-[7px] border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 disabled:opacity-40"
                >
                  반려
                </button>
              </>
            )}
            {(participant.status === 'content_submitted' || participant.status === 'verifying') && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('verify')}
                  className="rounded-[7px] bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  검증 완료
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode('reject')}
                  className="rounded-[7px] border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 disabled:opacity-40"
                >
                  반려
                </button>
              </>
            )}
            {participant.status === 'verified' && !autoPayout && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction('payout', { note: '수동 지급' })}
                className="rounded-[7px] bg-[#0066cc] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
              >
                수동 지급
              </button>
            )}
            {(participant.status === 'paid' || participant.status === 'rejected' || participant.status === 'expired') && (
              <span className="text-[11px] text-[#a1a1a6]">-</span>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

function ParticipantSection({
  title,
  participants,
  autoPayout,
  onAction,
  onOpenImage,
  busyId,
}: {
  title: string
  participants: AdminExperienceParticipant[]
  autoPayout: boolean
  onAction: (participantId: string, action: string, extra?: Record<string, string>) => void
  onOpenImage: (url: string) => void
  busyId: string | null
}) {
  if (participants.length === 0) return null
  return (
    <div className="rounded-[16px] border border-[#e0e0e0] bg-white overflow-hidden">
      <p className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f] bg-[#f5f5f7] border-b border-[#e0e0e0]">
        {title} ({participants.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[#6e6e73]">
              <th className="px-3 py-2 font-medium">크리에이터</th>
              <th className="px-3 py-2 font-medium">콘텐츠</th>
              <th className="px-3 py-2 font-medium">영수증</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                autoPayout={autoPayout}
                busy={busyId === participant.id}
                onAction={(action, extra) => onAction(participant.id, action, extra)}
                onOpenImage={onOpenImage}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LedgerSection({ ledger }: { ledger: AdminExperienceCampaignDetail['ledger'] }) {
  if (ledger.length === 0) return null
  const typeLabel: Record<string, string> = {
    fee: '수수료', reserve: '예약', release: '해제', payout: '지급', refund: '환불',
  }
  return (
    <div className="rounded-[16px] border border-[#e0e0e0] bg-white overflow-hidden">
      <p className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f] bg-[#f5f5f7] border-b border-[#e0e0e0]">
        예산 원장
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[#6e6e73]">
              <th className="px-3 py-2 font-medium">구분</th>
              <th className="px-3 py-2 font-medium text-right">금액</th>
              <th className="px-3 py-2 font-medium text-right">잔액</th>
              <th className="px-3 py-2 font-medium">메모</th>
              <th className="px-3 py-2 font-medium">시각</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.id} className="border-t border-[#e0e0e0]">
                <td className="px-3 py-2 text-[#1d1d1f]">{typeLabel[entry.type] ?? entry.type}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${entry.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {entry.amount > 0 ? '+' : ''}
                  {entry.amount.toLocaleString()}P
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-[#6e6e73]">
                  {entry.balance_after.toLocaleString()}P
                </td>
                <td className="px-3 py-2 text-[#6e6e73]">{entry.note ?? '-'}</td>
                <td className="px-3 py-2 text-[#a1a1a6]">{formatDate(entry.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CommentsSection({
  comments,
  onSubmit,
}: {
  comments: AdminExperienceCampaignDetail['comments']
  onSubmit: (body: string) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="rounded-[16px] border border-[#e0e0e0] bg-white p-4 space-y-3">
      <p className="text-[13px] font-semibold text-[#1d1d1f]">코멘트</p>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {comments.length === 0 && <p className="text-[12px] text-[#a1a1a6]">아직 코멘트가 없습니다</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-[9px] bg-[#f5f5f7] px-3 py-2">
            <p className="text-[11px] font-medium text-[#6e6e73]">
              {comment.author_role === 'admin' ? '어드민' : '사장님'} · {formatDate(comment.created_at)}
            </p>
            <p className="text-[13px] text-[#1d1d1f] mt-0.5 whitespace-pre-wrap">{comment.body}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="코멘트 남기기"
          className="flex-1 rounded-[7px] border border-[#e0e0e0] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#0066cc]"
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => {
            onSubmit(draft.trim())
            setDraft('')
          }}
          className="rounded-[7px] bg-[#0066cc] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
        >
          등록
        </button>
      </div>
    </div>
  )
}

export default function AdminExperienceCampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params.id

  const [data, setData] = useState<AdminExperienceCampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [savingSetup, setSavingSetup] = useState(false)
  const [reviewMode, setReviewMode] = useState<'idle' | 'reject' | 'request_change'>('idle')
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null)
  const [monitorRunning, setMonitorRunning] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setLoadError(null)
    fetch(`/api/admin/experience-campaigns/${campaignId}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '캠페인 정보를 불러오지 못했습니다')
        setData(body)
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [campaignId])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  async function patchCampaign(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch(`/api/admin/experience-campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const body = await res.json()
    if (!res.ok) {
      showToast(body.error ?? '처리에 실패했습니다')
      return false
    }
    load()
    return true
  }

  async function handleSaveSetup(values: SetupFormValues) {
    setSavingSetup(true)
    const ok = await patchCampaign('update_setup', {
      store_name: values.store_name,
      naver_place_id: values.naver_place_id || null,
      title: values.title,
      description: values.description,
      mission_type: values.mission_type,
      creator_types: values.creator_types,
      mission_conditions: values.mission_conditions,
      payback_amount: Number(values.payback_amount),
      capacity: Number(values.capacity),
      budget_total: Number(values.budget_total),
      start_date: values.start_date || null,
      end_date: values.end_date || null,
    })
    setSavingSetup(false)
    if (ok) showToast('세팅을 저장했습니다')
  }

  async function handleApprove() {
    const confirmed = window.confirm('이 캠페인을 승인하고 오픈합니다. 예산에서 수수료가 선차감됩니다. 계속할까요?')
    if (!confirmed) return
    const ok = await patchCampaign('approve')
    if (ok) showToast('캠페인을 승인했습니다')
  }

  async function handleClose() {
    const confirmed = window.confirm('이 캠페인을 마감합니다. 계속할까요?')
    if (!confirmed) return
    const ok = await patchCampaign('close')
    if (ok) showToast('캠페인을 마감했습니다')
  }

  async function handleToggleAutoPayout() {
    const ok = await patchCampaign('toggle_auto_payout')
    if (ok) showToast('자동 지급 설정을 변경했습니다')
  }

  async function handleParticipantAction(participantId: string, action: string, extra: Record<string, string> = {}) {
    setBusyParticipantId(participantId)
    try {
      const res = await fetch(`/api/admin/experience-campaigns/${campaignId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error ?? '처리에 실패했습니다')
        return
      }
      load()
    } finally {
      setBusyParticipantId(null)
    }
  }

  async function handleMonitorRun() {
    setMonitorRunning(true)
    try {
      const res = await fetch('/api/admin/experience-campaigns/monitor-run', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error ?? '모니터링 실행에 실패했습니다')
        return
      }
      showToast(`블로그 모니터링 완료: ${body.checked}명 중 ${body.detected}명 신규 감지`)
      load()
    } finally {
      setMonitorRunning(false)
    }
  }

  async function handleComment(body: string) {
    const res = await fetch(`/api/admin/experience-campaigns/${campaignId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!res.ok) {
      showToast('코멘트 등록에 실패했습니다')
      return
    }
    load()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[16px] bg-[#f5f5f7] animate-pulse" />
        ))}
      </div>
    )
  }
  if (loadError || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] text-red-600 mb-3">{loadError ?? '캠페인을 찾을 수 없습니다'}</p>
        <button onClick={load} className="text-[13px] text-[#0066cc] hover:underline">
          다시 시도
        </button>
      </div>
    )
  }

  const { campaign, participants, ledger, comments } = data
  const applied = participants.filter((p) => p.status === 'applied')
  const inProgress = participants.filter((p) => p.status === 'approved')
  const pendingVerification = participants.filter((p) => p.status === 'content_submitted' || p.status === 'verifying')
  const finished = participants.filter((p) => ['verified', 'paid', 'rejected', 'expired'].includes(p.status))

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="영수증 확대" className="max-h-full max-w-full rounded-[9px]" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/admin/experience-campaigns')} className="text-[13px] text-[#6e6e73] hover:underline">
          ← 목록
        </button>
      </div>

      <div className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[#1d1d1f]">{campaign.title}</h1>
              <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${CAMPAIGN_STATUS_STYLE[campaign.status]}`}>
                {CAMPAIGN_STATUS_LABEL[campaign.status]}
              </span>
            </div>
            <p className="text-[13px] text-[#6e6e73] mt-1">
              {campaign.store_name} · {MISSION_TYPE_LABEL[campaign.mission_type]} ·{' '}
              {campaign.owner_business_name || campaign.owner_email}
            </p>
            <p className="text-[12px] text-[#a1a1a6] mt-1">
              페이백 {campaign.payback_amount.toLocaleString()}P · 정원 {campaign.capacity}명 · 총예산{' '}
              {campaign.budget_total.toLocaleString()}P (수수료 {campaign.fee_rate}%)
            </p>
            <p className="text-[12px] text-[#a1a1a6] mt-0.5">
              가용 {campaign.budget_available.toLocaleString()}P / 예약 {campaign.budget_reserved.toLocaleString()}P
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CLOSABLE_STATUSES.includes(campaign.status) && (
              <>
                <button
                  type="button"
                  onClick={handleToggleAutoPayout}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium border ${
                    campaign.auto_payout
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-[#f5f5f7] text-[#6e6e73] border-[#e0e0e0]'
                  }`}
                >
                  자동 지급 {campaign.auto_payout ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  disabled={monitorRunning}
                  onClick={handleMonitorRun}
                  className="rounded-full border border-[#e0e0e0] px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] disabled:opacity-50"
                >
                  {monitorRunning ? '모니터링 중...' : '블로그 모니터링 지금 실행'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600"
                >
                  마감
                </button>
              </>
            )}
            {APPROVABLE_STATUSES.includes(campaign.status) && (
              <button
                type="button"
                onClick={handleApprove}
                className="rounded-full bg-[#0066cc] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0058b3]"
              >
                승인
              </button>
            )}
          </div>
        </div>

        {(campaign.status === 'rejected' || campaign.status === 'change_requested') && campaign.reject_reason && (
          <div className="mt-4 rounded-[9px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
            사유: {campaign.reject_reason}
          </div>
        )}

        {REVIEWABLE_STATUSES.includes(campaign.status) && (
          <div className="mt-4">
            {reviewMode === 'reject' && (
              <ReasonDialog
                label="반려 사유"
                confirmLabel="반려"
                onConfirm={async (reason) => {
                  const ok = await patchCampaign('reject', { reason })
                  setReviewMode('idle')
                  if (ok) showToast('캠페인을 반려했습니다')
                }}
                onCancel={() => setReviewMode('idle')}
              />
            )}
            {reviewMode === 'request_change' && (
              <ReasonDialog
                label="수정 요청 사유"
                confirmLabel="수정 요청"
                onConfirm={async (reason) => {
                  const ok = await patchCampaign('request_change', { reason })
                  setReviewMode('idle')
                  if (ok) showToast('수정을 요청했습니다')
                }}
                onCancel={() => setReviewMode('idle')}
              />
            )}
            {reviewMode === 'idle' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewMode('reject')}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600"
                >
                  반려
                </button>
                <button
                  type="button"
                  onClick={() => setReviewMode('request_change')}
                  className="rounded-full border border-[#e0e0e0] px-3 py-1.5 text-[12px] font-medium text-[#6e6e73]"
                >
                  수정 요청
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {ADMIN_SETUP_EDITABLE_STATUSES.includes(campaign.status) && (
        <SetupForm campaign={campaign} onSave={handleSaveSetup} saving={savingSetup} />
      )}

      <div className="space-y-4">
        <ParticipantSection
          title="승인 대기"
          participants={applied}
          autoPayout={campaign.auto_payout}
          onAction={handleParticipantAction}
          onOpenImage={setLightboxUrl}
          busyId={busyParticipantId}
        />
        <ParticipantSection
          title="참여 중 (콘텐츠 제출 대기)"
          participants={inProgress}
          autoPayout={campaign.auto_payout}
          onAction={handleParticipantAction}
          onOpenImage={setLightboxUrl}
          busyId={busyParticipantId}
        />
        <ParticipantSection
          title="검증 대기 (콘텐츠 제출됨)"
          participants={pendingVerification}
          autoPayout={campaign.auto_payout}
          onAction={handleParticipantAction}
          onOpenImage={setLightboxUrl}
          busyId={busyParticipantId}
        />
        <ParticipantSection
          title="완료"
          participants={finished}
          autoPayout={campaign.auto_payout}
          onAction={handleParticipantAction}
          onOpenImage={setLightboxUrl}
          busyId={busyParticipantId}
        />
        {participants.length === 0 && (
          <div className="rounded-[16px] border border-[#e0e0e0] bg-white p-8 text-center text-[13px] text-[#6e6e73]">
            아직 참여 신청이 없습니다
          </div>
        )}
      </div>

      <LedgerSection ledger={ledger} />
      <CommentsSection comments={comments} onSubmit={handleComment} />
    </div>
  )
}
