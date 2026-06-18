'use client'
import { useState } from 'react'

interface Receipt {
  id: string
  store_name: string | null
  amount: number | null
  points_earned: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_id: string
}

const MOCK: Receipt[] = [
  { id: 'r1', store_name: '강남 청과', amount: 45000, points_earned: 200, status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString(), user_id: 'demo' },
  { id: 'r2', store_name: '신선마트', amount: 128000, points_earned: 500, status: 'approved', created_at: new Date(Date.now() - 172800000).toISOString(), user_id: 'demo' },
  { id: 'r3', store_name: '바다수산', amount: 75000, points_earned: 200, status: 'pending', created_at: new Date().toISOString(), user_id: 'demo' },
]

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const filtered = filter === 'all' ? receipts : receipts.filter(r => r.status === filter)

  function updateStatus(id: string, status: 'approved' | 'rejected') {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[#1d1d1f]">영수증 관리</h1>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-[9999px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filter === f ? 'bg-[#0066cc] text-white' : 'bg-white border border-[#e0e0e0] text-[#6e6e73]'}`}>
              {f === 'all' ? '전체' : f === 'pending' ? '검토중' : f === 'approved' ? '승인' : '거절'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">가게명</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">금액</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">포인트</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">등록일</th>
              <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-[#f5f5f7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1d1d1f]">{r.store_name || '-'}</td>
                <td className="px-4 py-3 text-[#6e6e73]">{r.amount ? `${r.amount.toLocaleString()}원` : '-'}</td>
                <td className="px-4 py-3 font-medium text-[#0066cc]">+{r.points_earned}P</td>
                <td className="px-4 py-3">
                  <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${
                    r.status === 'approved' ? 'bg-green-50 text-green-700' :
                    r.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {r.status === 'approved' ? '승인' : r.status === 'pending' ? '검토중' : '거절'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6e6e73]">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(r.id, 'approved')} className="rounded-[9999px] bg-green-50 text-green-700 px-2.5 py-1 text-[11px] font-medium hover:bg-green-100 transition-colors">승인</button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="rounded-[9999px] bg-red-50 text-red-700 px-2.5 py-1 text-[11px] font-medium hover:bg-red-100 transition-colors">거절</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
