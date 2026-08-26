'use client'
import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  my_membership: MyMembership | null
}

const PLACEHOLDER_THUMBNAILS: Record<string, string> = {
  blog:       '📝',
  place:      '📍',
  experience: '⭐',
  ads:        '📣',
  other:      '🛒',
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

function DealThumbnail({ deal, discountPct }: { deal: TeamDeal; discountPct: number }) {
  const emoji = PLACEHOLDER_THUMBNAILS[deal.category] ?? '🛒'
  return (
    <div className="relative bg-[#f5f5f7] h-44 overflow-hidden">
      {deal.thumbnail_url ? (
        <img src={deal.thumbnail_url} alt={deal.title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="text-5xl">{emoji}</span>
        </div>
      )}
      <span className="absolute top-2.5 right-2.5 rounded-[9999px] bg-[#0066cc] px-2 py-0.5 text-[11px] font-semibold text-white">
        {discountPct}% 할인
      </span>
      {deal.my_membership?.status === 'joined' && (
        <span className="absolute top-2.5 left-2.5 rounded-[9999px] bg-green-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          참여함 · {deal.my_membership.quantity}개
        </span>
      )}
    </div>
  )
}

function DealCard({ deal }: { deal: TeamDeal }) {
  const router = useRouter()
  const timer = useCountdown(deal.deadline)
  const pct = Math.round((deal.current_count / deal.target_count) * 100)
  const remaining = deal.target_count - deal.current_count
  const discountPct = Math.round((1 - deal.deal_price / deal.original_price) * 100)
  const joined = deal.my_membership?.status === 'joined'

  return (
    <div
      className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden cursor-pointer hover:border-[#0066cc]/40 hover:shadow-md transition-all"
      onClick={() => router.push(`/team-buy/${deal.id}`)}
    >
      <DealThumbnail deal={deal} discountPct={discountPct} />

      <div className="p-4">
        <p className="text-[13px] font-medium text-[#1d1d1f] leading-snug line-clamp-2 mb-2">{deal.title}</p>
        {deal.description && (
          <p className="text-[11px] text-[#6e6e73] mb-2 line-clamp-1">{deal.description}</p>
        )}

        <div className="flex items-end gap-1.5 mb-3">
          <span className="text-[18px] font-semibold text-[#1d1d1f]">{deal.deal_price.toLocaleString()}P</span>
          <span className="mb-0.5 text-[12px] text-[#6e6e73] line-through">{deal.original_price.toLocaleString()}원</span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-[#6e6e73] mb-1">
            <span>{deal.current_count}/{deal.target_count}개 모집</span>
            <span className="font-mono">{timer}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-[9999px] bg-[#f5f5f7]">
            <div className="h-full rounded-[9999px] bg-[#0066cc] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); router.push(`/team-buy/${deal.id}`) }}
          className={`w-full rounded-[9999px] py-2 text-[13px] font-semibold transition-colors ${
            joined
              ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              : 'bg-[#0066cc] text-white hover:bg-[#0058b3]'
          }`}
        >
          {joined ? '참여 완료 · 상세 보기' : remaining <= 0 ? '마감 임박 · 상세 보기' : '자세히 보고 참여하기'}
        </button>
      </div>
    </div>
  )
}

export default function TeamBuyPage() {
  const [deals, setDeals] = useState<TeamDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/team-deals')
      const body = await res.json()
      if (!res.ok) {
        setLoadError(body.error ?? '팀구매 목록을 불러오지 못했습니다')
      } else {
        setDeals(body)
      }
    } catch {
      setLoadError('네트워크 연결을 확인해주세요')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadDeals() }, [loadDeals])

  const activeDeals = deals.filter(d => d.status === 'active')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">팀 구매</h2>
        <p className="text-[13px] text-[#6e6e73] mt-0.5">사장님들과 함께 마케팅 서비스를 반값에</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-80 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-16">
          <p className="text-[15px] text-[#1d1d1f] mb-1">{loadError}</p>
          <p className="text-[13px] text-[#6e6e73] mb-4">잠시 후 다시 시도해주세요</p>
          <button
            onClick={loadDeals}
            className="rounded-[9999px] bg-[#0066cc] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors"
          >
            다시 불러오기
          </button>
        </div>
      ) : activeDeals.length === 0 ? (
        <div className="text-center py-16 text-[#6e6e73]">
          <p className="text-[15px] mb-1">지금 진행 중인 팀 구매가 없습니다</p>
          <p className="text-[13px]">새로운 딜이 열리면 이곳에 표시됩니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activeDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}
