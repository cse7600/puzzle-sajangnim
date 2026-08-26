'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeamDealFormModal } from '@/components/admin/TeamDealFormModal'
import {
  AdminTeamDeal,
  DEAL_CATEGORY_EMOJI,
  DEAL_CATEGORY_OPTIONS,
  DEAL_STATUS_LABEL,
  DEAL_STATUS_STYLE,
} from '@/components/admin/team-deal-types'

const CATEGORY_LABEL = Object.fromEntries(DEAL_CATEGORY_OPTIONS.map(opt => [opt.value, opt.label]))

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function DealThumbnail({ deal }: { deal: AdminTeamDeal }) {
  if (deal.thumbnail_url) {
    return (
      <img
        src={deal.thumbnail_url}
        alt={`${deal.title} 썸네일`}
        className="h-10 w-14 rounded-lg object-cover border border-[#e0e0e0]"
      />
    )
  }
  return (
    <div className="h-10 w-14 rounded-lg bg-[#f5f5f7] flex items-center justify-center text-[18px]">
      {DEAL_CATEGORY_EMOJI[deal.category] ?? '🛒'}
    </div>
  )
}

function RecruitProgress({ deal }: { deal: AdminTeamDeal }) {
  const pct = Math.min(100, Math.round((deal.current_count / deal.target_count) * 100))
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[#1d1d1f] font-medium tabular-nums">
          {deal.joined_quantity}/{deal.target_count}개
        </span>
        <div className="w-20 h-1.5 rounded-full bg-[#e0e0e0] overflow-hidden">
          <div className="h-full rounded-full bg-[#0066cc]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-[11px] text-[#6e6e73] mt-0.5">신청자 {deal.applicant_count}명</p>
    </div>
  )
}

export default function AdminTeamDealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<AdminTeamDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<AdminTeamDeal | null | 'create'>(null)
  const [cancellingDealId, setCancellingDealId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setLoadError(null)
    fetch('/api/admin/team-deals')
      .then(async res => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '팀구매 목록을 불러오지 못했습니다')
        setDeals(Array.isArray(body) ? body : [])
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCancelDeal(deal: AdminTeamDeal) {
    const confirmed = window.confirm(
      `"${deal.title}" 딜을 취소합니다. 신청자 ${deal.applicant_count}명 전원에게 포인트가 환불됩니다. 계속할까요?`
    )
    if (!confirmed) return
    setCancellingDealId(deal.id)
    try {
      const res = await fetch(`/api/admin/team-deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error ?? '딜 취소에 실패했습니다')
        return
      }
      showToast(`딜을 취소하고 ${body.refunded_members}명에게 환불했습니다`)
      load()
    } catch {
      showToast('딜 취소 중 네트워크 오류가 발생했습니다')
    } finally {
      setCancellingDealId(null)
    }
  }

  function handleSaved() {
    setFormTarget(null)
    showToast('저장했습니다')
    load()
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f]">팀 구매 관리</h1>
        <button
          onClick={() => setFormTarget('create')}
          className="rounded-[9999px] bg-[#0066cc] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0058b3] transition-colors"
        >
          딜 등록
        </button>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-red-600 mb-3">{loadError}</p>
            <button onClick={load} className="text-[13px] text-[#0066cc] hover:underline">다시 시도</button>
          </div>
        ) : deals.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">
            등록된 팀 구매 딜이 없습니다. 첫 딜을 등록해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">딜</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">카테고리</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6e6e73]">딜가</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">모집 현황</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">마감</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {deals.map(deal => (
                  <tr key={deal.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <DealThumbnail deal={deal} />
                        <span className="font-medium text-[#1d1d1f]">{deal.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{CATEGORY_LABEL[deal.category] ?? deal.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1d1d1f]">
                      {deal.deal_price.toLocaleString()}P
                    </td>
                    <td className="px-4 py-3">
                      <RecruitProgress deal={deal} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${DEAL_STATUS_STYLE[deal.status]}`}>
                        {DEAL_STATUS_LABEL[deal.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{formatDeadline(deal.deadline)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <button onClick={() => setFormTarget(deal)} className="text-[12px] text-[#0066cc] hover:underline">
                          편집
                        </button>
                        <button
                          onClick={() => router.push(`/admin/team-deals/${deal.id}/members`)}
                          className="text-[12px] text-[#0066cc] hover:underline"
                        >
                          신청자
                        </button>
                        {(deal.status === 'active' || deal.status === 'completed') && (
                          <button
                            onClick={() => handleCancelDeal(deal)}
                            disabled={cancellingDealId === deal.id}
                            className="text-[12px] text-red-600 hover:underline disabled:opacity-40"
                          >
                            {cancellingDealId === deal.id ? '처리 중...' : '딜 취소'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget !== null && (
        <TeamDealFormModal
          deal={formTarget === 'create' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
