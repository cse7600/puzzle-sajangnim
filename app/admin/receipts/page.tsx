'use client'
import { useEffect, useState } from 'react'

interface Receipt {
  id: string
  store_name: string | null
  amount: number | null
  points_earned: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user_id: string
  image_url: string | null
}

function useAdminReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetch('/api/receipts?scope=all')
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Receipt[]) => setReceipts(Array.isArray(data) ? data : []))
      .catch(() => setError('영수증 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      const updated = await res.json() as Receipt
      setReceipts(prev => prev.map(r => (r.id === id ? updated : r)))
    } finally {
      setUpdatingId(null)
    }
  }

  return { receipts, loading, error, updatingId, updateStatus }
}

function ReceiptThumbnail({ imageUrl, onOpen }: { imageUrl: string | null; onOpen: () => void }) {
  if (!imageUrl) {
    return <span className="text-[11px] text-[#6e6e73]">사진 없음</span>
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block h-12 w-12 overflow-hidden rounded-[8px] border border-[#e0e0e0] hover:border-[#0066cc] transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 원격 URL 썸네일 */}
      <img src={imageUrl} alt="영수증 사진" className="h-full w-full object-cover" />
    </button>
  )
}

function ImageLightbox({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 원격 URL 미리보기 */}
      <img
        src={imageUrl}
        alt="영수증 원본"
        className="max-h-[90vh] max-w-[90vw] rounded-[12px] object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-6 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-medium text-[#1d1d1f] hover:bg-white transition-colors"
      >
        닫기
      </button>
    </div>
  )
}

export default function AdminReceiptsPage() {
  const { receipts, loading, error, updatingId, updateStatus } = useAdminReceipts()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const filtered = filter === 'all' ? receipts : receipts.filter(r => r.status === filter)

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
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-[14px]">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">등록된 영수증이 없습니다</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">사진</th>
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
                  <td className="px-4 py-3">
                    <ReceiptThumbnail imageUrl={r.image_url} onOpen={() => r.image_url && setPreviewUrl(r.image_url)} />
                  </td>
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
                        <button
                          onClick={() => updateStatus(r.id, 'approved')}
                          disabled={updatingId === r.id}
                          className="rounded-[9999px] bg-green-50 text-green-700 px-2.5 py-1 text-[11px] font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'rejected')}
                          disabled={updatingId === r.id}
                          className="rounded-[9999px] bg-red-50 text-red-700 px-2.5 py-1 text-[11px] font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          거절
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewUrl && <ImageLightbox imageUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  )
}
