'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'next/navigation'

interface ParticipantStatus {
  id: string
  status: string
  nickname: string
  content_url: string | null
  receipt_image_url: string | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; participant: ParticipantStatus }

const STATUS_GUIDE: Record<string, string> = {
  applied: '아직 사장님 승인 전이에요. 승인 후 다시 접속해주세요.',
  approved: '',
  content_submitted: '이미 콘텐츠/영수증을 제출했어요. 검증 후 페이백이 지급됩니다.',
  verifying: '제출한 내용을 검증하고 있어요. 곧 결과가 나와요.',
  verified: '검증이 완료됐어요. 곧 페이백이 지급됩니다.',
  paid: '페이백 지급이 완료됐어요. 감사합니다!',
  rejected: '아쉽게도 참여가 반려되었어요.',
  expired: '참여 가능 기간이 만료되었어요.',
}

export default function SubmitContentPage() {
  const params = useParams<{ id: string; participantId: string }>()
  const { participantId } = params

  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [contentUrl, setContentUrl] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/public/experience-participants/${participantId}/submit`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setLoadState({ status: 'not_found' })
          return
        }
        if (!res.ok) {
          setLoadState({ status: 'error', message: '참여 정보를 불러오지 못했습니다' })
          return
        }
        const data = (await res.json()) as ParticipantStatus
        setLoadState({ status: 'ready', participant: data })
      })
      .catch(() => {
        if (!cancelled) setLoadState({ status: 'error', message: '네트워크 오류가 발생했습니다' })
      })
    return () => {
      cancelled = true
    }
  }, [participantId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setSubmitError('영수증 사진을 첨부해주세요')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      if (contentUrl) formData.append('content_url', contentUrl)
      formData.append('receipt_image', file)

      const res = await fetch(`/api/public/experience-participants/${participantId}/submit`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? '제출 처리에 실패했습니다')
        return
      }
      setSubmitted(true)
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
    return <CenteredMessage>참여 신청 정보를 찾을 수 없습니다.</CenteredMessage>
  }
  if (loadState.status === 'error') {
    return <CenteredMessage>{loadState.message}</CenteredMessage>
  }

  const { participant } = loadState

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">제출 완료</p>
          <p className="mt-2 text-sm text-gray-500">검증 후 페이백이 지급됩니다.</p>
        </div>
      </div>
    )
  }

  if (participant.status !== 'approved') {
    return <CenteredMessage>{STATUS_GUIDE[participant.status] ?? '지금은 제출할 수 없는 상태입니다.'}</CenteredMessage>
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary-dark">{participant.nickname}님</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">콘텐츠 · 영수증 제출</h1>
          <p className="mt-2 text-sm text-gray-500">
            방문/구매 후 작성한 게시물 링크와 영수증 사진을 제출해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-gray-500">콘텐츠 링크 (선택)</span>
            <input
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://blog.naver.com/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-primary-dark focus:outline-none"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-gray-500">영수증 사진</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500"
            />
            {fileName && <span className="mt-1 block text-xs text-gray-500">{fileName}</span>}
          </label>

          {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-500">{children}</p>
    </div>
  )
}
