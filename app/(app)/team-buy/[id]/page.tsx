'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Share2, Copy, Check, Users } from 'lucide-react'

interface TeamDeal {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string
  original_price: number
  deal_price: number
  leader_price: number
  target_count: number
  current_count: number
  deadline: string
  status: string
  content_html?: string
}

const PLACEHOLDER_THUMBNAILS: Record<string, string> = {
  blog: '📝', place: '📍', experience: '⭐', ads: '📣', other: '🛒',
}

const CATEGORY_LABELS: Record<string, string> = {
  blog: 'AI 블로그', place: '플레이스', experience: '체험단', ads: '광고', other: '기타',
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

export default function TeamDealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string

  const [deal, setDeal] = useState<TeamDeal | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/team-deals')
      .then(r => r.json())
      .then((deals: TeamDeal[]) => {
        const found = deals.find(d => d.id === dealId)
        setDeal(found ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [dealId])

  const timer = useCountdown(deal?.deadline ?? new Date(Date.now() + 86400000).toISOString())

  async function handleJoin() {
    if (!deal) return
    setJoining(true)
    try {
      const res = await fetch(`/api/team-deals/${deal.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (data.success) {
        setDeal(prev => prev ? { ...prev, current_count: data.new_count, status: data.status } : prev)
        setJoinResult({ success: true, message: data.status === 'completed' ? '팀 구매 완료!' : `참여 완료! ${data.target_count - data.new_count}명 더 모집 중` })
      } else {
        setJoinResult({ success: false, message: '이미 참여하거나 마감된 딜입니다.' })
      }
    } catch {
      setJoinResult({ success: false, message: '네트워크 오류가 발생했습니다.' })
    }
    setJoining(false)
    setTimeout(() => setJoinResult(null), 3000)
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* 토스트 */}
      {joinResult && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] px-5 py-3 text-[14px] font-medium text-white shadow-lg ${joinResult.success ? 'bg-green-600' : 'bg-red-500'}`}>
          {joinResult.message}
        </div>
      )}

      {/* 뒤로가기 */}
      <button
        onClick={() => router.push('/team-buy')}
        className="flex items-center gap-1.5 text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        팀 구매 목록
      </button>

      {/* 썸네일 */}
      <div className="relative bg-[#f5f5f7] rounded-[18px] h-52 flex items-center justify-center mb-4 overflow-hidden">
        <span className="text-8xl">{emoji}</span>
        <span className="absolute top-4 right-4 rounded-[9999px] bg-[#0066cc] px-3 py-1 text-[13px] font-semibold text-white">
          {discountPct}% 할인
        </span>
        <span className="absolute top-4 left-4 rounded-[9999px] bg-white/90 px-3 py-1 text-[12px] font-medium text-[#1d1d1f]">
          {CATEGORY_LABELS[deal.category] ?? deal.category}
        </span>
      </div>

      {/* 딜 정보 */}
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 mb-4">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">{deal.title}</h1>
        {deal.description && (
          <p className="text-[14px] text-[#6e6e73] mb-4">{deal.description}</p>
        )}
        {deal.content_html && (
          <div
            className="mt-4 pt-4 border-t border-gray-100 text-[14px] leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: deal.content_html }}
          />
        )}

        {/* 가격 */}
        <div className="flex items-end gap-2 mb-5">
          <span className="text-[32px] font-semibold text-[#1d1d1f]">{deal.deal_price.toLocaleString()}원</span>
          <span className="mb-1 text-[16px] text-[#6e6e73] line-through">{deal.original_price.toLocaleString()}원</span>
        </div>

        {/* 가격 비교 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-[11px] bg-[#f5f5f7] p-3 text-center">
            <p className="text-[11px] text-[#6e6e73] mb-0.5">팀원 가격</p>
            <p className="text-[16px] font-semibold text-[#1d1d1f]">{deal.deal_price.toLocaleString()}원</p>
          </div>
          <div className="rounded-[11px] bg-[#0066cc]/5 border border-[#0066cc]/20 p-3 text-center">
            <p className="text-[11px] text-[#0066cc] mb-0.5">방장 특별가</p>
            <p className="text-[16px] font-semibold text-[#0066cc]">{deal.leader_price.toLocaleString()}원</p>
          </div>
        </div>

        {/* 진행 현황 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="flex items-center gap-1.5 text-[#6e6e73]">
              <Users className="h-4 w-4" />
              {deal.current_count}/{deal.target_count}명 참여
            </span>
            <span className="font-mono text-[#1d1d1f] font-medium">{timer} 남음</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-[9999px] bg-[#f5f5f7]">
            <div className="h-full rounded-[9999px] bg-[#0066cc] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {remaining > 0 && (
            <p className="mt-1.5 text-[12px] text-[#6e6e73]">{remaining}명 더 모이면 딜이 성사됩니다</p>
          )}
        </div>
      </div>

      {/* CTA 버튼 */}
      <div className="flex gap-3 sticky bottom-6">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-[9999px] border border-[#e0e0e0] bg-white px-5 py-3.5 text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
          {copied ? '복사됨' : '공유하기'}
        </button>
        <button
          onClick={handleJoin}
          disabled={joining || timer === '마감' || deal.status !== 'active'}
          className="flex-1 rounded-[9999px] bg-[#0066cc] py-3.5 text-[14px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
        >
          {joining ? '처리 중...' : remaining <= 0 ? '마감 임박' : `${remaining}명 남음 · 참여하기`}
        </button>
      </div>
    </div>
  )
}
