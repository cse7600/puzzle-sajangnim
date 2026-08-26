'use client'
import { useCallback, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Share2, Check, Users, Minus, Plus } from 'lucide-react'

interface MyMembership {
  quantity: number
  price_paid: number
  status: string
}

interface TeamDeal {
  id: string
  title: string
  description: string | null
  category: string
  original_price: number
  deal_price: number
  target_count: number
  current_count: number
  deadline: string
  status: string
  thumbnail_url: string | null
  content_html: string | null
  my_membership: MyMembership | null
}

const PLACEHOLDER_THUMBNAILS: Record<string, string> = {
  blog: '📝', place: '📍', experience: '⭐', ads: '📣', other: '🛒',
}

const CATEGORY_LABELS: Record<string, string> = {
  blog: 'AI 블로그', place: '플레이스', experience: '체험단', ads: '광고', other: '기타',
}

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  joined: '신청 완료',
  refunded: '환불됨 (모집 미달)',
  cancelled: '취소됨 (환불 완료)',
}

function useCountdown(deadline: string) {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const update = () => setMs(Math.max(0, new Date(deadline).getTime() - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [deadline])
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return ms <= 0 ? '마감' : `${pad(h)}:${pad(m)}:${pad(s)}`
}

interface JoinSheetProps {
  deal: TeamDeal
  onClose: () => void
  onJoined: (message: string) => void
  onError: (message: string) => void
}

function JoinSheet({ deal, onClose, onJoined, onError }: JoinSheetProps) {
  const remaining = deal.target_count - deal.current_count
  const maxQuantity = Math.max(1, Math.min(remaining, 10))
  const [quantity, setQuantity] = useState(1)
  const [balance, setBalance] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/points/summary')
      .then(r => r.json())
      .then((summary: { total?: number }) => setBalance(summary.total ?? 0))
      .catch(() => setBalance(0))
  }, [])

  const totalPrice = deal.deal_price * quantity
  const balanceAfter = balance === null ? null : balance - totalPrice
  const insufficient = balanceAfter !== null && balanceAfter < 0

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/team-deals/${deal.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const body = await res.json()
      if (body.success) {
        onJoined(body.completed ? '팀 구매가 성사됐습니다! 참여가 확정됐어요.' : `참여 완료! ${body.price_paid.toLocaleString()}P가 결제됐습니다.`)
      } else {
        const detail = body.reason === 'insufficient_points' && body.balance !== undefined
          ? ` (보유 ${body.balance.toLocaleString()}P)`
          : ''
        onError(`${body.error}${detail}`)
      }
    } catch {
      onError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-[24px] sm:rounded-[18px] w-full sm:max-w-[440px] p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">참여 정보 확인</h3>
        <p className="text-[13px] text-[#6e6e73] mb-5 line-clamp-1">{deal.title}</p>

        <div className="flex items-center justify-between mb-5">
          <span className="text-[14px] text-[#1d1d1f]">신청 수량</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-[9999px] border border-[#e0e0e0] text-[#1d1d1f] disabled:opacity-30"
              aria-label="수량 줄이기"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-[16px] font-semibold text-[#1d1d1f]">{quantity}</span>
            <button
              onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="flex h-8 w-8 items-center justify-center rounded-[9999px] border border-[#e0e0e0] text-[#1d1d1f] disabled:opacity-30"
              aria-label="수량 늘리기"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-[11px] bg-[#f5f5f7] p-4 mb-5 space-y-2 text-[13px]">
          <div className="flex justify-between text-[#6e6e73]">
            <span>{deal.deal_price.toLocaleString()}P × {quantity}개</span>
            <span className="font-semibold text-[#1d1d1f]">{totalPrice.toLocaleString()}P</span>
          </div>
          <div className="flex justify-between text-[#6e6e73]">
            <span>보유 포인트</span>
            <span>{balance === null ? '확인 중...' : `${balance.toLocaleString()}P`}</span>
          </div>
          <div className="flex justify-between border-t border-[#e0e0e0] pt-2">
            <span className="text-[#6e6e73]">결제 후 잔액</span>
            <span className={`font-semibold ${insufficient ? 'text-red-500' : 'text-[#1d1d1f]'}`}>
              {balanceAfter === null ? '—' : `${balanceAfter.toLocaleString()}P`}
            </span>
          </div>
        </div>

        {insufficient && (
          <p className="text-[13px] text-red-500 mb-4">
            포인트가 {Math.abs(balanceAfter!).toLocaleString()}P 부족합니다
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[14px] text-[#6e6e73]">
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || balance === null || insufficient}
            className="flex-[2] rounded-[9999px] bg-[#0066cc] py-3 text-[14px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
          >
            {submitting ? '결제 중...' : `${totalPrice.toLocaleString()}P 결제하고 참여 확정`}
          </button>
        </div>
      </div>
    </div>
  )
}

function MembershipBanner({ membership }: { membership: MyMembership }) {
  return (
    <div className="rounded-[14px] bg-green-50 border border-green-200 px-4 py-3 mb-4">
      <p className="text-[13px] font-semibold text-green-800">
        {MEMBERSHIP_STATUS_LABELS[membership.status] ?? membership.status}
      </p>
      <p className="text-[12px] text-green-700 mt-0.5">
        {membership.quantity}개 신청 · {membership.price_paid.toLocaleString()}P 결제
      </p>
    </div>
  )
}

export default function TeamDealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string

  const [deal, setDeal] = useState<TeamDeal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const loadDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-deals/${dealId}`)
      setDeal(res.ok ? await res.json() : null)
    } catch {
      setDeal(null)
    }
    setLoading(false)
  }, [dealId])

  useEffect(() => { loadDeal() }, [loadDeal])

  const timer = useCountdown(deal?.deadline ?? new Date(Date.now() + 86400000).toISOString())

  function showToast(success: boolean, message: string) {
    setToast({ success, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleJoined(message: string) {
    setShowJoinSheet(false)
    showToast(true, message)
    loadDeal()
  }

  function handleJoinError(message: string) {
    setShowJoinSheet(false)
    showToast(false, message)
    loadDeal()
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: deal?.title ?? '팀 구매 딜', url })
    } else {
      navigator.clipboard?.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-64 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse mb-4" />
        <div className="h-48 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 text-[#6e6e73]">
        <p className="text-[16px] mb-4">딜을 찾을 수 없습니다</p>
        <button onClick={() => router.push('/team-buy')} className="text-[#0066cc] text-[14px] hover:underline">
          팀 구매 목록으로
        </button>
      </div>
    )
  }

  const pct = Math.round((deal.current_count / deal.target_count) * 100)
  const remaining = deal.target_count - deal.current_count
  const discountPct = Math.round((1 - deal.deal_price / deal.original_price) * 100)
  const emoji = PLACEHOLDER_THUMBNAILS[deal.category] ?? '🛒'
  const joined = deal.my_membership?.status === 'joined'
  const joinable = !joined && deal.status === 'active' && timer !== '마감' && remaining > 0

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] px-5 py-3 text-[14px] font-medium text-white shadow-lg ${toast.success ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <button
        onClick={() => router.push('/team-buy')}
        className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        팀 구매 목록
      </button>

      <div className="relative bg-[#f5f5f7] rounded-[18px] h-64 mb-4 overflow-hidden">
        {deal.thumbnail_url ? (
          <img src={deal.thumbnail_url} alt={deal.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-8xl">{emoji}</span>
          </div>
        )}
        <span className="absolute top-4 right-4 rounded-[9999px] bg-[#0066cc] px-3 py-1 text-[13px] font-semibold text-white">
          {discountPct}% 할인
        </span>
        <span className="absolute top-4 left-4 rounded-[9999px] bg-white/90 px-3 py-1 text-[12px] font-medium text-[#1d1d1f]">
          {CATEGORY_LABELS[deal.category] ?? deal.category}
        </span>
      </div>

      {deal.my_membership && <MembershipBanner membership={deal.my_membership} />}

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mb-4">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">{deal.title}</h1>
        {deal.description && (
          <p className="text-[14px] text-[#6e6e73] mb-4">{deal.description}</p>
        )}

        <div className="flex items-end gap-2 mb-5">
          <span className="text-[32px] font-semibold text-[#1d1d1f]">{deal.deal_price.toLocaleString()}P</span>
          <span className="mb-1 text-[16px] text-[#6e6e73] line-through">{deal.original_price.toLocaleString()}원</span>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="flex items-center gap-1.5 text-[#6e6e73]">
              <Users className="h-4 w-4" />
              {deal.current_count}/{deal.target_count}개 모집
            </span>
            <span className="font-mono text-[#1d1d1f] font-medium">{timer} 남음</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-[9999px] bg-[#f5f5f7]">
            <div className="h-full rounded-[9999px] bg-[#0066cc] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {remaining > 0 && (
            <p className="mt-1.5 text-[12px] text-[#6e6e73]">{remaining}개 더 모이면 딜이 성사됩니다</p>
          )}
        </div>

        {deal.content_html && (
          <div
            className="mt-4 pt-4 border-t border-gray-100 text-[14px] leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: deal.content_html }}
          />
        )}
      </div>

      <div className="flex gap-3 sticky bottom-6">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-[9999px] border border-[#e0e0e0] bg-white px-5 py-3.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
          {copied ? '복사됨' : '공유하기'}
        </button>
        <button
          onClick={() => setShowJoinSheet(true)}
          disabled={!joinable}
          className="flex-1 rounded-[9999px] bg-[#0066cc] py-3.5 text-[14px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
        >
          {joined ? '이미 참여한 팀 구매입니다' : timer === '마감' || deal.status !== 'active' ? '마감된 팀 구매입니다' : remaining <= 0 ? '모집이 마감됐습니다' : `${remaining}개 남음 · 참여하기`}
        </button>
      </div>

      {showJoinSheet && deal && (
        <JoinSheet deal={deal} onClose={() => setShowJoinSheet(false)} onJoined={handleJoined} onError={handleJoinError} />
      )}
    </div>
  )
}
