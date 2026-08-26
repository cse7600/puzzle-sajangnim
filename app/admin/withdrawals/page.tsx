'use client'
import { useEffect, useState } from 'react'
import { WithdrawalStatus, WITHDRAWAL_STATUS_LABEL } from '@/lib/hub'

interface AdminWithdrawal {
  id: string
  user_id: string
  payback_id: string
  amount: number
  status: WithdrawalStatus
  bank_name: string
  account_number: string
  account_holder: string
  requested_at: string
  processed_at: string | null
  reject_reason: string | null
  payback_sync_mismatch: boolean
  advertiser_name: string
}

const STATUS_STYLE: Record<WithdrawalStatus, string> = {
  requested: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-[#f5f5f7] text-[#6e6e73]',
  rejected: 'bg-red-50 text-red-700',
  canceled: 'bg-[#f5f5f7] text-[#a1a1a6]',
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function RejectDialog({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="반려 사유"
        className="w-32 rounded-[7px] border border-[#e0e0e0] px-2 py-1 text-[12px] outline-none focus:border-[#0066cc]"
      />
      <button
        type="button"
        disabled={!reason.trim()}
        onClick={() => onConfirm(reason.trim())}
        className="rounded-[7px] bg-red-600 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
      >
        확인
      </button>
      <button type="button" onClick={onCancel} className="text-[11px] text-[#a1a1a6]">취소</button>
    </div>
  )
}

function ActionCell({ row, onAction }: { row: AdminWithdrawal; onAction: (status: 'processing' | 'paid' | 'rejected', rejectReason?: string) => void }) {
  const [rejecting, setRejecting] = useState(false)

  if (rejecting) {
    return <RejectDialog onConfirm={reason => onAction('rejected', reason)} onCancel={() => setRejecting(false)} />
  }

  if (row.status === 'requested') {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onAction('processing')} className="rounded-[7px] bg-[#0066cc] px-2 py-1 text-[11px] font-medium text-white">
          접수
        </button>
        <button type="button" onClick={() => setRejecting(true)} className="rounded-[7px] border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600">
          반려
        </button>
      </div>
    )
  }
  if (row.status === 'processing') {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onAction('paid')} className="rounded-[7px] bg-[#0066cc] px-2 py-1 text-[11px] font-medium text-white">
          지급 완료
        </button>
        <button type="button" onClick={() => setRejecting(true)} className="rounded-[7px] border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600">
          반려
        </button>
      </div>
    )
  }
  return <span className="text-[11px] text-[#a1a1a6]">-</span>
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/withdrawals')
      .then(r => r.json())
      .then(body => setWithdrawals(Array.isArray(body.withdrawals) ? body.withdrawals : []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAction(id: string, status: 'processing' | 'paid' | 'rejected', rejectReason?: string) {
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reject_reason: rejectReason }),
    })
    const body = await res.json()
    if (!res.ok) {
      showToast(body.error ?? '처리에 실패했습니다')
      return
    }
    if (body.warning) showToast(body.warning)
    load()
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">출금 관리</h1>
      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">출금 신청 내역이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">광고주</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">금액</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계좌</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">신청일</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {withdrawals.map(row => (
                <tr key={row.id} className="hover:bg-[#f5f5f7] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1d1d1f]">{row.advertiser_name}</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-[#1d1d1f]">{row.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-[#1d1d1f]">
                    {row.bank_name} {row.account_number} ({row.account_holder})
                  </td>
                  <td className="px-4 py-3 text-[#6e6e73]">{formatDate(row.requested_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-[9999px] px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                      {WITHDRAWAL_STATUS_LABEL[row.status]}
                    </span>
                    {row.payback_sync_mismatch && (
                      <span className="ml-1.5 rounded-[9999px] bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                        정산 동기화 실패
                      </span>
                    )}
                    {row.status === 'rejected' && row.reject_reason && (
                      <p className="mt-0.5 text-[11px] text-[#a1a1a6]">{row.reject_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActionCell row={row} onAction={(status, reason) => handleAction(row.id, status, reason)} />
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
