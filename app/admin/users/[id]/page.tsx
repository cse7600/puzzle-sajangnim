'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PLATFORM_INFO, TRANSFER_STATUS_LABEL, CONNECTION_STATUS_LABEL } from '@/lib/hub'
import type { AdAccount, BusinessVerification } from '@/types/database'

interface VerificationDetail extends BusinessVerification {
  certificate_url: string | null
}

interface PaybackSummary {
  pending: number
  confirmed: number
  paid: number
  total: number
}

interface UserDetailResponse {
  user: { id: string; email: string; business_name: string; created_at: string }
  verification: VerificationDetail | null
  ad_accounts: AdAccount[]
  paybacks: PaybackSummary
  budget: { total_monthly_spend: number }
}

const CONNECTION_LABEL_FALLBACK: Record<string, string> = {
  duplicate: '중복 계정',
  reviewing: '검토 중',
  connected: '연동 완료',
}

function money(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

function platformLabel(platform: string) {
  return PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO]?.name ?? platform
}

function connectionLabel(status: string) {
  const known = Object.prototype.hasOwnProperty.call(CONNECTION_STATUS_LABEL, status)
  return known ? CONNECTION_STATUS_LABEL[status as keyof typeof CONNECTION_STATUS_LABEL] : CONNECTION_LABEL_FALLBACK[status] ?? status
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 bg-[#e5e5ea] rounded" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
      <div className="h-40 w-full bg-[#e5e5ea] rounded-[18px]" />
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[18px] border border-[#e0e0e0] p-6">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function VerificationDecisionControls({
  onDecide,
  deciding,
}: {
  onDecide: (decision: 'approved' | 'rejected', reviewerNote?: string) => void
  deciding: boolean
}) {
  const [rejectNote, setRejectNote] = useState('')
  return (
    <div className="space-y-3 border-t border-[#e0e0e0] pt-4">
      <button
        type="button"
        disabled={deciding}
        onClick={() => onDecide('approved')}
        className="rounded-full bg-[#0066cc] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
      >
        승인
      </button>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="반려 사유를 입력하세요"
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          className="flex-1 rounded-[9px] border border-[#e0e0e0] px-3 py-2 text-[13px] outline-none focus:border-red-400"
        />
        <button
          type="button"
          disabled={deciding || !rejectNote.trim()}
          onClick={() => onDecide('rejected', rejectNote)}
          className="rounded-full bg-red-500 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          반려
        </button>
      </div>
    </div>
  )
}

function VerificationInfo({ verification }: { verification: VerificationDetail }) {
  return (
    <div className="space-y-2 text-[13px] text-[#1d1d1f] mb-4">
      <div>사업자 번호: <span className="font-medium">{verification.business_number}</span></div>
      <div>제출일: {new Date(verification.submitted_at).toLocaleString('ko-KR')}</div>
      {verification.certificate_url && (
        <a
          href={verification.certificate_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[#0066cc] underline"
        >
          사업자 등록증 보기
        </a>
      )}
      {verification.status === 'rejected' && (
        <div className="text-red-600">반려 사유: {verification.reviewer_note ?? '(없음)'}</div>
      )}
    </div>
  )
}

function VerificationCard({
  verification,
  onDecide,
  deciding,
}: {
  verification: VerificationDetail | null
  onDecide: (decision: 'approved' | 'rejected', reviewerNote?: string) => void
  deciding: boolean
}) {
  if (!verification) {
    return (
      <Card title="사업자 등록 현황">
        <p className="text-[13px] text-[#6e6e73]">아직 사업자 정보를 제출하지 않았습니다</p>
      </Card>
    )
  }

  return (
    <Card title="사업자 등록 현황">
      <VerificationInfo verification={verification} />
      {verification.status === 'pending' && (
        <VerificationDecisionControls onDecide={onDecide} deciding={deciding} />
      )}
    </Card>
  )
}

function AdAccountsCard({ accounts }: { accounts: AdAccount[] }) {
  if (accounts.length === 0) {
    return (
      <Card title="광고 매체 연동 현황">
        <p className="text-[13px] text-[#6e6e73]">연동된 광고 계정이 없습니다</p>
      </Card>
    )
  }
  return (
    <Card title="광고 매체 연동 현황">
      <table className="w-full text-[13px]">
        <thead className="text-left text-[#6e6e73]">
          <tr>
            <th className="pb-2">매체</th>
            <th className="pb-2">계정명</th>
            <th className="pb-2">월 광고비</th>
            <th className="pb-2">연동 상태</th>
            <th className="pb-2">이관 상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f2]">
          {accounts.map(a => (
            <tr key={a.id}>
              <td className="py-2 font-medium">{platformLabel(a.platform)}</td>
              <td className="py-2">{a.account_name}</td>
              <td className="py-2">{money(a.monthly_spend)}</td>
              <td className="py-2">{connectionLabel(a.connection_status)}</td>
              <td className="py-2">{TRANSFER_STATUS_LABEL[a.transfer_status] ?? a.transfer_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function PaybacksCard({ paybacks }: { paybacks: PaybackSummary }) {
  return (
    <Card title="수익 현황">
      <div className="grid grid-cols-4 gap-3 text-[13px]">
        <div><p className="text-[#6e6e73] mb-1">처리중</p><p className="font-semibold">{money(paybacks.pending)}</p></div>
        <div><p className="text-[#6e6e73] mb-1">확정</p><p className="font-semibold">{money(paybacks.confirmed)}</p></div>
        <div><p className="text-[#6e6e73] mb-1">지급완료</p><p className="font-semibold">{money(paybacks.paid)}</p></div>
        <div><p className="text-[#6e6e73] mb-1">합계</p><p className="font-semibold text-[#0066cc]">{money(paybacks.total)}</p></div>
      </div>
    </Card>
  )
}

function BudgetCard({ accounts, totalMonthlySpend }: { accounts: AdAccount[]; totalMonthlySpend: number }) {
  const totalVerifiedSpend = accounts.reduce((sum, a) => sum + (a.verified_spend ?? 0), 0)
  const hasVerified = accounts.some(a => a.verified_spend !== null)
  return (
    <Card title="예산 현황">
      <div className="flex gap-8 text-[13px]">
        <div><p className="text-[#6e6e73] mb-1">신고 월 광고비 합계</p><p className="font-semibold">{money(totalMonthlySpend)}</p></div>
        {hasVerified && (
          <div><p className="text-[#6e6e73] mb-1">검증된 광고비 합계</p><p className="font-semibold">{money(totalVerifiedSpend)}</p></div>
        )}
      </div>
    </Card>
  )
}

function useUserDetail(userId: string) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/users/${userId}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: UserDetailResponse) => !cancelled && setDetail(data))
      .catch(async (res: Response | Error) => {
        if (cancelled) return
        const message = res instanceof Response && res.status === 404
          ? '존재하지 않는 사용자입니다'
          : '사용자 정보를 불러오지 못했습니다'
        setLoadError(message)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return { detail, setDetail, loadError }
}

async function decideVerification(userId: string, verificationId: string, decision: 'approved' | 'rejected', reviewerNote?: string) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_id: verificationId, decision, reviewer_note: reviewerNote }),
  })
  if (!res.ok) return null
  return fetch(`/api/admin/users/${userId}`).then(r => r.json() as Promise<UserDetailResponse>)
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { detail, setDetail, loadError } = useUserDetail(params.id)
  const [deciding, setDeciding] = useState(false)

  async function handleDecide(decision: 'approved' | 'rejected', reviewerNote?: string) {
    if (!detail?.verification) return
    setDeciding(true)
    try {
      const updated = await decideVerification(params.id, detail.verification.id, decision, reviewerNote)
      if (updated) setDetail(updated)
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/admin/users')}
        className="mb-4 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f]"
      >
        ← 사용자 목록으로
      </button>

      {loadError ? (
        <div className="rounded-[11px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {loadError}
        </div>
      ) : !detail ? (
        <DetailSkeleton />
      ) : (
        <div className="space-y-4">
          <h1 className="text-[20px] font-semibold text-[#1d1d1f]">{detail.user.business_name}</h1>
          <p className="text-[13px] text-[#6e6e73] -mt-3">{detail.user.email}</p>
          <VerificationCard verification={detail.verification} onDecide={handleDecide} deciding={deciding} />
          <AdAccountsCard accounts={detail.ad_accounts} />
          <PaybacksCard paybacks={detail.paybacks} />
          <BudgetCard accounts={detail.ad_accounts} totalMonthlySpend={detail.budget.total_monthly_spend} />
        </div>
      )}
    </div>
  )
}
