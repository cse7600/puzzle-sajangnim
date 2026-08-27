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

interface MySurveySummary {
  total: number
  required_total: number
  answered: number
  required_answered: number
  status: 'none' | 'pending' | 'partial' | 'done'
}

interface MyTeamBuyEntry {
  member_id: string
  quantity: number
  price_paid: number
  status: string
  joined_at: string
  deal: {
    id: string
    title: string
    thumbnail_url: string | null
    category: string
    deal_price: number
    status: string
  } | null
  survey: MySurveySummary
}

const PLACEHOLDER_THUMBNAILS: Record<string, string> = {
  blog:       '📝',
  place:      '📍',
  experience: '⭐',
  ads:        '📣',
  other:      '🛒',
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
  joined: '신청 완료',
  refunded: '환불됨 (모집 미달)',
  cancelled: '취소됨 (환불 완료)',
}

const MEMBER_STATUS_STYLES: Record<string, string> = {
  joined: 'bg-green-50 text-green-700',
  refunded: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
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
      <span className="absolute top-2.5 right-2.5 rounded-[9999px] bg-primary px-2 py-0.5 text-[11px] font-semibold text-ink">
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
      className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden cursor-pointer hover:border-primary-dark/40 hover:shadow-md transition-all"
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
            <div className="h-full rounded-[9999px] bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); router.push(`/team-buy/${deal.id}`) }}
          className={`w-full rounded-[9999px] py-2 text-[13px] font-semibold transition-colors ${
            joined
              ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
              : 'bg-primary text-ink hover:bg-primary-hover'
          }`}
        >
          {joined ? '참여 완료 · 상세 보기' : remaining <= 0 ? '마감 임박 · 상세 보기' : '자세히 보고 참여하기'}
        </button>
      </div>
    </div>
  )
}

function AllDealsTab() {
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-80 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
        ))}
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] text-[#1d1d1f] mb-1">{loadError}</p>
        <p className="text-[13px] text-[#6e6e73] mb-4">잠시 후 다시 시도해주세요</p>
        <button
          onClick={loadDeals}
          className="rounded-[9999px] bg-primary px-5 py-2 text-[13px] font-semibold text-ink hover:bg-primary-hover transition-colors"
        >
          다시 불러오기
        </button>
      </div>
    )
  }
  if (activeDeals.length === 0) {
    return (
      <div className="text-center py-16 text-[#6e6e73]">
        <p className="text-[15px] mb-1">지금 진행 중인 팀 구매가 없습니다</p>
        <p className="text-[13px]">새로운 딜이 열리면 이곳에 표시됩니다</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {activeDeals.map(deal => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}

function formatJoinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function SurveyBadge({ survey }: { survey: MySurveySummary }) {
  if (survey.status === 'none') return null
  if (survey.status === 'done') {
    return (
      <span className="rounded-[9999px] bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
        설문 작성완료
      </span>
    )
  }
  return (
    <span className="rounded-[9999px] bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
      추가 정보 입력 필요
    </span>
  )
}

function MyTeamBuyCard({ entry }: { entry: MyTeamBuyEntry }) {
  const router = useRouter()
  const deal = entry.deal
  if (!deal) return null
  const emoji = PLACEHOLDER_THUMBNAILS[deal.category] ?? '🛒'
  const target = entry.survey.status !== 'none' ? `/team-buy/${deal.id}/survey` : `/team-buy/${deal.id}`

  return (
    <div
      className="flex items-center gap-4 bg-white rounded-[18px] border border-[#e0e0e0] p-4 cursor-pointer hover:border-primary-dark/40 hover:shadow-md transition-all"
      onClick={() => router.push(target)}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[11px] bg-[#f5f5f7]">
        {deal.thumbnail_url ? (
          <img src={deal.thumbnail_url} alt={deal.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">{emoji}</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#1d1d1f] leading-snug line-clamp-1 mb-1">{deal.title}</p>
        <p className="text-[12px] text-[#6e6e73]">
          {entry.quantity}개 · {entry.price_paid.toLocaleString()}P 결제 · {formatJoinedDate(entry.joined_at)} 신청
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${MEMBER_STATUS_STYLES[entry.status] ?? 'bg-[#f5f5f7] text-[#6e6e73]'}`}>
            {MEMBER_STATUS_LABELS[entry.status] ?? entry.status}
          </span>
          <SurveyBadge survey={entry.survey} />
        </div>
      </div>
    </div>
  )
}

function MyTeamBuysTab() {
  const [entries, setEntries] = useState<MyTeamBuyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/team-deals/my')
      const body = await res.json()
      if (!res.ok) {
        setLoadError(body.error ?? '내 팀구매 신청 내역을 불러오지 못했습니다')
      } else {
        setEntries(Array.isArray(body) ? body : [])
      }
    } catch {
      setLoadError('네트워크 연결을 확인해주세요')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />
        ))}
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] text-[#1d1d1f] mb-1">{loadError}</p>
        <p className="text-[13px] text-[#6e6e73] mb-4">잠시 후 다시 시도해주세요</p>
        <button
          onClick={loadEntries}
          className="rounded-[9999px] bg-primary px-5 py-2 text-[13px] font-semibold text-ink hover:bg-primary-hover transition-colors"
        >
          다시 불러오기
        </button>
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-[#6e6e73]">
        <p className="text-[15px] mb-1">아직 참여한 팀 구매가 없습니다</p>
        <p className="text-[13px]">전체 딜 탭에서 진행 중인 딜을 확인해보세요</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <MyTeamBuyCard key={entry.member_id} entry={entry} />
      ))}
    </div>
  )
}

type TabKey = 'all' | 'mine'

export default function TeamBuyPage() {
  const [tab, setTab] = useState<TabKey>('all')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: '전체 딜' },
    { key: 'mine', label: '내 팀구매' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">팀 구매</h2>
        <p className="text-[13px] text-[#6e6e73] mt-0.5">사장님들과 함께 마케팅 서비스를 반값에</p>
      </div>

      <div className="mb-5 flex gap-2">
        {tabs.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-[9999px] px-4 py-2 text-[13px] font-semibold transition-colors ${
              tab === item.key
                ? 'bg-primary text-ink'
                : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed] hover:text-[#1d1d1f]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? <AllDealsTab /> : <MyTeamBuysTab />}
    </div>
  )
}
