'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  AdminDealMember,
  AdminTeamDeal,
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_STYLE,
} from './team-deal-types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function TeamDealMembersModal({
  deal,
  onClose,
  onChanged,
}: {
  deal: AdminTeamDeal
  onClose: () => void
  onChanged: () => void
}) {
  const [members, setMembers] = useState<AdminDealMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setLoadError(null)
    fetch(`/api/admin/team-deals/${deal.id}/members`)
      .then(async res => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '신청자 목록을 불러오지 못했습니다')
        setMembers(Array.isArray(body) ? body : [])
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [deal.id])

  async function handleCancel(member: AdminDealMember) {
    const confirmed = window.confirm(
      `${member.business_name}님의 신청을 취소하고 ${member.price_paid.toLocaleString()}P를 환불합니다. 계속할까요?`
    )
    if (!confirmed) return
    setCancellingId(member.id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/team-deals/${deal.id}/members/${member.id}/cancel`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setActionError(body.error ?? '취소 처리에 실패했습니다')
        return
      }
      load()
      onChanged()
    } catch {
      setActionError('취소 처리 중 네트워크 오류가 발생했습니다')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[20px] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e0e0]">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">구매 신청 이력</h2>
            <p className="text-[12px] text-[#6e6e73] mt-0.5">{deal.title}</p>
          </div>
          <button onClick={onClose} className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {actionError && (
          <p className="mx-6 mt-4 rounded-[11px] bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">
            {actionError}
          </p>
        )}

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-red-600 mb-3">{loadError}</p>
            <button onClick={load} className="text-[13px] text-[#0066cc] hover:underline">다시 시도</button>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">아직 신청자가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상호명</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">이메일</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6e6e73]">수량</th>
                  <th className="text-right px-4 py-3 font-medium text-[#6e6e73]">결제 포인트</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">신청일시</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6e6e73]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1d1d1f]">{member.business_name}</td>
                    <td className="px-4 py-3 text-[#6e6e73]">{member.email}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#1d1d1f]">{member.quantity}개</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1d1d1f]">
                      {member.price_paid.toLocaleString()}P
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${MEMBER_STATUS_STYLE[member.status]}`}>
                        {MEMBER_STATUS_LABEL[member.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{formatDateTime(member.joined_at)}</td>
                    <td className="px-4 py-3">
                      {member.status === 'joined' && (
                        <button
                          onClick={() => handleCancel(member)}
                          disabled={cancellingId === member.id}
                          className="rounded-[7px] border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {cancellingId === member.id ? '처리 중...' : '취소·환불'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
