'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import { MISSION_TYPE_LABEL, CREATOR_TYPE_LABEL, type CreatorType } from '@/lib/experience-campaigns'

interface PublicCampaign {
  id: string
  store_name: string
  title: string
  description: string | null
  mission_type: keyof typeof MISSION_TYPE_LABEL
  creator_types: CreatorType[]
  mission_conditions: string
  payback_amount: number
  capacity: number
  approved_count: number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; campaign: PublicCampaign }

const CREATOR_TYPE_OPTIONS: CreatorType[] = ['blog', 'instagram', 'youtube', 'tiktok']

export default function JoinCampaignPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [creatorType, setCreatorType] = useState<CreatorType>('blog')
  const [channelHandle, setChannelHandle] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/public/experience-campaigns/${campaignId}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setLoadState({ status: 'not_found' })
          return
        }
        if (!res.ok) {
          setLoadState({ status: 'error', message: '캠페인 정보를 불러오지 못했습니다' })
          return
        }
        const data = (await res.json()) as PublicCampaign
        setLoadState({ status: 'ready', campaign: data })
      })
      .catch(() => {
        if (!cancelled) setLoadState({ status: 'error', message: '네트워크 오류가 발생했습니다' })
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/experience-campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          phone,
          creator_type: creatorType,
          channel_handle: channelHandle,
          channel_url: channelUrl || undefined,
          email: email || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? '신청 처리에 실패했습니다')
        return
      }
      setParticipantId(data.participant_id)
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadState.status === 'loading') {
    return <CenteredMessage>불러오는 중...</CenteredMessage>
  }
  if (loadState.status === 'not_found') {
    return <CenteredMessage>모집 중이 아닌 캠페인입니다.</CenteredMessage>
  }
  if (loadState.status === 'error') {
    return <CenteredMessage>{loadState.message}</CenteredMessage>
  }

  const { campaign } = loadState
  const submitLink = participantId ? `/join/${campaignId}/submit/${participantId}` : null
  const remaining = Math.max(campaign.capacity - campaign.approved_count, 0)
  const isFull = remaining <= 0

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        {/* 헤더 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-primary-dark">{campaign.store_name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{campaign.title}</h1>
          {campaign.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">{campaign.description}</p>
          )}
        </div>

        {/* 지급 조건 — 가장 눈에 띄게 */}
        <div className="mb-6 rounded-xl border border-primary-dark/20 bg-accent-bg p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-ink">
              {MISSION_TYPE_LABEL[campaign.mission_type]}
            </span>
            <span className="text-sm font-medium text-gray-500">지급 조건</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {campaign.mission_conditions}
          </p>
          <p className="mt-4 text-lg font-semibold text-primary-dark">
            이 조건을 완료하면 {campaign.payback_amount.toLocaleString('ko-KR')}원을 페이백 받아요
          </p>
        </div>

        {/* 참여 가능 채널 */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900">참여 가능한 채널</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {campaign.creator_types.map((t) => (
              <span key={t} className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                {CREATOR_TYPE_LABEL[t]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            모집 {campaign.capacity}명 중 {campaign.approved_count}명 진행 중 · 잔여 {remaining}명
          </p>
        </div>

        {/* 신청 완료 */}
        {submitLink ? (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-900">신청이 접수되었습니다</p>
            <p className="mt-1 text-sm text-gray-500">
              사장님 승인 후 아래 링크에서 콘텐츠 링크와 영수증을 제출해주세요. 이 링크를 저장해두세요.
            </p>
            <a
              href={submitLink}
              className="mt-4 block break-all rounded-lg border border-primary-dark/30 bg-accent-bg px-4 py-3 text-sm font-medium text-primary-dark hover:bg-primary-hover"
            >
              {submitLink}
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-gray-900">참여 신청</p>

            <Field label="닉네임">
              <input
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input"
                placeholder="블로그/채널에서 사용하는 이름"
              />
            </Field>
            <Field label="연락처">
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="010-0000-0000"
              />
            </Field>
            <Field label="채널 유형">
              <select
                value={creatorType}
                onChange={(e) => setCreatorType(e.target.value as CreatorType)}
                className="input"
              >
                {CREATOR_TYPE_OPTIONS.filter((t) => campaign.creator_types.includes(t)).map((t) => (
                  <option key={t} value={t}>
                    {CREATOR_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="채널 아이디 / 링크">
              <input
                required
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
                className="input"
                placeholder={creatorType === 'blog' ? '네이버 블로그 아이디 또는 URL' : '채널 아이디 또는 URL'}
              />
            </Field>
            <Field label="채널 URL (선택)">
              <input
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="input"
                placeholder="https://..."
              />
            </Field>
            <Field label="이메일 (선택)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </Field>

            {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting || isFull}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isFull ? '모집이 마감되었습니다' : submitting ? '신청 중...' : '참여 신청하기'}
            </button>
          </form>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
        }
        .input:focus {
          outline: none;
          border-color: #163300;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-500">{children}</p>
    </div>
  )
}
