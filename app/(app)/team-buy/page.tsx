'use client'
import { useState, useEffect } from 'react'

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

function DealCard({ deal, onJoin }: { deal: TeamDeal; onJoin: (id: string) => void }) {
  const timer = useCountdown(deal.deadline)
  const pct = Math.round((deal.current_count / deal.target_count) * 100)
  const remaining = deal.target_count - deal.current_count
  const discountPct = Math.round((1 - deal.deal_price / deal.original_price) * 100)

  return (
    <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] leading-snug">{deal.title}</h3>
          {deal.description && <p className="text-[13px] text-[#6e6e73] mt-0.5">{deal.description}</p>}
        </div>
        <span className="ml-3 shrink-0 rounded-[9999px] bg-[#0066cc] px-2.5 py-1 text-[12px] font-semibold text-white">{discountPct}% 할인</span>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-[24px] font-semibold text-[#1d1d1f]">{deal.deal_price.toLocaleString()}원</span>
        <span className="mb-0.5 text-[14px] text-[#6e6e73] line-through">{deal.original_price.toLocaleString()}원</span>
      </div>

      {/* 진행 바 */}
      <div className="mb-3">
        <div className="flex justify-between text-[12px] text-[#6e6e73] mb-1.5">
          <span>{deal.current_count}/{deal.target_count}명 참여</span>
          <span className="font-mono">{timer} 남음</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-[9999px] bg-[#f5f5f7]">
          <div className="h-full rounded-[9999px] bg-[#0066cc] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <button
        onClick={() => onJoin(deal.id)}
        disabled={timer === '마감' || deal.status !== 'active'}
        className="w-full rounded-[9999px] bg-[#0066cc] py-3 text-[14px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40 transition-colors"
      >
        {remaining <= 0 ? '마감 임박' : `${remaining}명 남음 · 참여하기`}
      </button>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  blog: 'AI 블로그',
  place: '플레이스',
  experience: '체험단',
  ads: '광고',
  other: '기타',
}

export default function TeamBuyPage() {
  const [deals, setDeals] = useState<TeamDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', category: 'blog',
    original_price: '', deal_price: '', leader_price: '',
    target_count: '5', deadline_hours: '24',
  })

  useEffect(() => {
    fetch('/api/team-deals').then(r => r.json()).then(data => {
      setDeals(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleJoin(dealId: string) {
    setJoining(dealId)
    try {
      const res = await fetch(`/api/team-deals/${dealId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()

      if (data.success) {
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, current_count: data.new_count, status: data.status } : d))
        setJoinResult({ success: true, message: data.status === 'completed' ? '팀 구매 완료! 결제가 진행됩니다.' : `참여 완료! ${data.target_count - data.new_count}명 더 모집 중입니다.` })
      } else {
        setJoinResult({ success: false, message: '이미 참여하거나 마감된 딜입니다.' })
      }
    } catch {
      setJoinResult({ success: false, message: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' })
    }
    setJoining(null)
    setTimeout(() => setJoinResult(null), 3000)
  }

  async function handleCreate() {
    try {
      const res = await fetch('/api/team-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          original_price: Number(form.original_price.replace(/,/g, '')),
          deal_price: Number(form.deal_price.replace(/,/g, '')),
          leader_price: Number(form.leader_price.replace(/,/g, '')),
          target_count: Number(form.target_count),
          deadline_hours: Number(form.deadline_hours),
        }),
      })
      const newDeal = await res.json()
      setDeals(prev => [newDeal, ...prev])
      setShowCreate(false)
    } catch {
      setShowCreate(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 알림 토스트 */}
      {joinResult && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] px-5 py-3 text-[14px] font-medium text-white shadow-lg ${joinResult.success ? 'bg-green-600' : 'bg-red-500'}`}>
          {joinResult.message}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold text-[#1d1d1f]">팀 구매</h2>
          <p className="text-[13px] text-[#6e6e73] mt-0.5">사장님들과 함께 마케팅 서비스를 반값에</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-[#0066cc] text-white rounded-[9999px] px-4 py-2 text-[14px] font-medium hover:bg-[#0058b3] transition-colors"
        >
          딜 만들기
        </button>
      </div>

      {/* 딜 목록 */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-[18px] bg-white border border-[#e0e0e0] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {deals.filter(d => d.status === 'active').map(deal => (
            <DealCard key={deal.id} deal={deal} onJoin={handleJoin} />
          ))}
          {deals.filter(d => d.status === 'active').length === 0 && (
            <div className="text-center py-16 text-[#6e6e73]">
              <p className="text-[15px] mb-1">진행 중인 딜이 없습니다</p>
              <p className="text-[13px]">첫 번째 딜을 직접 만들어보세요</p>
            </div>
          )}
        </div>
      )}

      {/* 딜 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-t-[24px] sm:rounded-[18px] w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-5">새 팀 구매 딜 만들기</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">카테고리</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] bg-white outline-none focus:border-[#0066cc]">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">딜 제목</label>
                <input type="text" placeholder="예: AI 블로그 6개월 패키지" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">설명 (선택)</label>
                <input type="text" placeholder="어떤 서비스인지 간단히" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-4 py-3 text-[15px] outline-none focus:border-[#0066cc] transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#1d1d1f] mb-1.5">정가 (원)</label>
                  <input type="text" placeholder="600,000" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066cc]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#1d1d1f] mb-1.5">팀원 가격</label>
                  <input type="text" placeholder="300,000" value={form.deal_price} onChange={e => setForm(f => ({ ...f, deal_price: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066cc]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#1d1d1f] mb-1.5">방장 가격</label>
                  <input type="text" placeholder="240,000" value={form.leader_price} onChange={e => setForm(f => ({ ...f, leader_price: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-3 py-2.5 text-[14px] outline-none focus:border-[#0066cc]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#1d1d1f] mb-1.5">목표 인원</label>
                  <select value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#0066cc]">
                    {[2,3,4,5,6,7,8,10].map(n => <option key={n} value={n}>{n}명</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#1d1d1f] mb-1.5">마감 시간</label>
                  <select value={form.deadline_hours} onChange={e => setForm(f => ({ ...f, deadline_hours: e.target.value }))} className="w-full rounded-[11px] border border-[#e0e0e0] px-3 py-2.5 text-[14px] bg-white outline-none focus:border-[#0066cc]">
                    {[6,12,24,48,72].map(h => <option key={h} value={h}>{h}시간</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-[9999px] border border-[#e0e0e0] py-3 text-[14px] text-[#6e6e73]">취소</button>
              <button onClick={handleCreate} disabled={!form.title || !form.original_price || !form.deal_price} className="flex-1 rounded-[9999px] bg-[#0066cc] py-3 text-[14px] font-semibold text-white hover:bg-[#0058b3] disabled:opacity-40">딜 만들기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
