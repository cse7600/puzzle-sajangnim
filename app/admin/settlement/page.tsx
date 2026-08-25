'use client'
import { useState, useEffect } from 'react'

interface Payback {
  id: string
  user_id: string
  amount: number
  period: string
  status: 'pending' | 'confirmed' | 'paid'
  scheduled_pay_date: string | null
  cost_basis: 'submitted' | 'verified'
  ad_accounts: { platform: string; account_name: string }
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'paid'] as const
const STATUS_LABEL: Record<string, string> = { pending: '처리중', confirmed: '확정', paid: '지급완료' }

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminSettlementPage() {
  const [settlementDay, setSettlementDay] = useState<number>(10)
  const [savingDay, setSavingDay] = useState(false)
  const [paybacks, setPaybacks] = useState<Payback[]>([])
  const [loading, setLoading] = useState(true)
  const [generatePeriod, setGeneratePeriod] = useState(currentPeriod())
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/settlement-config').then(r => r.json()),
      fetch('/api/paybacks?scope=all').then(r => r.json()),
    ]).then(([config, pbs]) => {
      setSettlementDay(config.settlement_day ?? 10)
      setPaybacks(Array.isArray(pbs) ? pbs : [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function saveSettlementDay() {
    setSavingDay(true)
    try {
      const res = await fetch('/api/settlement-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement_day: settlementDay }),
      })
      if (res.ok) showToast('정산 마감일이 변경되었습니다')
    } finally {
      setSavingDay(false)
    }
  }

  async function generateSettlement() {
    setGenerating(true)
    try {
      const res = await fetch('/api/paybacks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: generatePeriod }),
      })
      const body = await res.json() as { created?: number; skipped?: number; error?: string }
      if (res.ok) {
        showToast(`정산 ${body.created}건 생성, ${body.skipped}건 건너뜀`)
        load()
      } else {
        showToast(body.error ?? '정산 생성에 실패했습니다')
      }
    } finally {
      setGenerating(false)
    }
  }

  async function updateRecord(id: string, patch: { scheduled_pay_date?: string; status?: string }) {
    const res = await fetch(`/api/paybacks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setPaybacks(prev => prev.map(p => p.id === id ? { ...p, ...patch } as Payback : p))
    }
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-[11px] bg-[#0066cc] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      <h1 className="text-[20px] font-semibold text-[#1d1d1f] mb-5">정산 관리</h1>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5 mb-5">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">정산 마감일 설정</h2>
        <p className="text-[13px] text-[#6e6e73] mb-4">매월 이 날짜가 전월 광고비에 대한 정산 마감일이자 기본 지급 예정일이 됩니다. (개별 건은 아래에서 따로 조정 가능)</p>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#6e6e73]">매월</span>
          <input
            type="number"
            min={1}
            max={28}
            value={settlementDay}
            onChange={e => setSettlementDay(Number(e.target.value))}
            className="w-20 rounded-[9px] border border-[#e0e0e0] px-3 py-2 text-[14px] text-center outline-none focus:border-[#0066cc]"
          />
          <span className="text-[13px] text-[#6e6e73]">일</span>
          <button
            onClick={saveSettlementDay}
            disabled={savingDay}
            className="rounded-[9999px] bg-[#0066cc] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#0058b3] disabled:opacity-50 transition-colors"
          >
            {savingDay ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] p-5 mb-5">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">정산 생성</h2>
        <p className="text-[13px] text-[#6e6e73] mb-4">영업권 이관이 완료된(연동 완료) 계정만 대상입니다. 이미 생성된 계정은 건너뜁니다.</p>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={generatePeriod}
            onChange={e => setGeneratePeriod(e.target.value)}
            className="rounded-[9px] border border-[#e0e0e0] px-3 py-2 text-[14px] outline-none focus:border-[#0066cc]"
          />
          <button
            onClick={generateSettlement}
            disabled={generating}
            className="rounded-[9999px] bg-[#0066cc] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#0058b3] disabled:opacity-50 transition-colors"
          >
            {generating ? '생성 중...' : '이번 달 정산 생성'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[18px] border border-[#e0e0e0] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-[#f5f5f7] animate-pulse" />)}
          </div>
        ) : paybacks.length === 0 ? (
          <div className="p-8 text-center text-[#6e6e73] text-[14px]">생성된 정산 내역이 없습니다</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">기간</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계정</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">기준</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">금액</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">지급 예정일</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {paybacks.map(p => (
                <tr key={p.id} className="hover:bg-[#f5f5f7] transition-colors">
                  <td className="px-4 py-3 text-[#1d1d1f]">{p.period}</td>
                  <td className="px-4 py-3 text-[#1d1d1f]">{p.ad_accounts?.account_name}</td>
                  <td className="px-4 py-3 text-[#6e6e73]">{p.cost_basis === 'verified' ? '확인됨' : '제출값'}</td>
                  <td className="px-4 py-3 font-medium text-[#0066cc]">{p.amount.toLocaleString()}P</td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      defaultValue={p.scheduled_pay_date ?? ''}
                      onBlur={e => e.target.value && updateRecord(p.id, { scheduled_pay_date: e.target.value })}
                      className="rounded-[7px] border border-[#e0e0e0] px-2 py-1 text-[12px] outline-none focus:border-[#0066cc]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={e => updateRecord(p.id, { status: e.target.value })}
                      className="rounded-[7px] border border-[#e0e0e0] px-2 py-1 text-[12px] outline-none focus:border-[#0066cc]"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/api/paybacks/statement?period=${p.period}&user_id=${p.user_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] text-[#0066cc] hover:underline"
                    >
                      보기
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
