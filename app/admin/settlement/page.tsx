'use client'
import { useState, useEffect } from 'react'
import { PAYBACK_STATUSES, PAYBACK_STATUS_LABEL, COST_BASIS_LABEL, PaybackStatus, CostBasis } from '@/lib/hub'

interface AdAccountSummary {
  platform: string
  account_name: string
  monthly_spend: number
  payback_rate: number
  verified_spend: number | null
}

interface Payback {
  id: string
  user_id: string
  ad_account_id: string
  amount: number
  period: string
  status: PaybackStatus
  cost_basis: CostBasis
  scheduled_pay_date: string | null
  processed_at: string | null
  created_at: string
  reviewed_by_1: string | null
  reviewed_at_1: string | null
  reviewed_by_2: string | null
  reviewed_at_2: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  spend_basis_amount: number
  ad_accounts: AdAccountSummary | null
  advertiser_name: string
}

// 정산서는 광고주(사장님) 단위·월 단위로 발행되므로, 같은 광고주가 같은 달에 광고계정을 여러 개
// 연동해도 "광고주 칼럼 안에 월 정산"으로 묶여 보여야 실제 발행 기준과 일치한다.
interface AdvertiserPeriodGroup {
  key: string
  advertiserName: string
  userId: string
  period: string
  items: Payback[]
  total: number
}

function groupByAdvertiserPeriod(paybacks: Payback[]): AdvertiserPeriodGroup[] {
  const groups = new Map<string, AdvertiserPeriodGroup>()
  for (const p of paybacks) {
    const key = `${p.user_id}:${p.period}`
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(p)
      existing.total += p.amount
    } else {
      groups.set(key, { key, advertiserName: p.advertiser_name, userId: p.user_id, period: p.period, items: [p], total: p.amount })
    }
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.advertiserName.localeCompare(b.advertiserName, 'ko') || b.period.localeCompare(a.period)
  )
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '-'
}

function shortActor(id: string | null): string {
  return id ? `${id.slice(0, 8)}…` : '-'
}

function CostBasisBadge({ payback }: { payback: Payback }) {
  const rate = payback.ad_accounts?.payback_rate ?? 0
  const computed = Math.round(payback.spend_basis_amount * (rate / 100))
  const delta = payback.amount - computed

  if (payback.cost_basis === 'manual') {
    return (
      <div className="space-y-0.5">
        <span className="inline-block rounded-pill bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {COST_BASIS_LABEL.manual}
        </span>
        <p className="text-[11px] text-muted-light">
          계산값 {computed.toLocaleString()}P ({delta >= 0 ? '+' : ''}{delta.toLocaleString()}P 차이)
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <span className="text-[12px] text-muted">{COST_BASIS_LABEL[payback.cost_basis]}</span>
      <p className="text-[11px] text-muted-light">{payback.spend_basis_amount.toLocaleString()}원 기준 · {rate}%</p>
      {delta !== 0 && (
        <p className="text-[11px] text-muted-light">
          계산값 {computed.toLocaleString()}P ({delta >= 0 ? '+' : ''}{delta.toLocaleString()}P 차이)
        </p>
      )}
    </div>
  )
}

function AuditTrail({ payback }: { payback: Payback }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[12px]">
      <button type="button" onClick={() => setOpen(prev => !prev)} className="text-muted underline decoration-dotted">
        {open ? '접기' : '이력 보기'}
      </button>
      {open && (
        <dl className="mt-1 space-y-0.5 text-[11px] text-muted-light">
          <div className="flex justify-between gap-3">
            <dt>1차검토</dt>
            <dd>{formatDate(payback.reviewed_at_1)} · {shortActor(payback.reviewed_by_1)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>2차검토</dt>
            <dd>{formatDate(payback.reviewed_at_2)} · {shortActor(payback.reviewed_by_2)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>확정</dt>
            <dd>{formatDate(payback.confirmed_at)} · {shortActor(payback.confirmed_by)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function AmountEditor({ payback, onSaved }: { payback: Payback; onSaved: (updated: Partial<Payback>) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(payback.amount))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setValue(String(payback.amount))
    setError(null)
    setEditing(true)
  }

  async function save() {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('0 이상의 정수를 입력하세요')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/paybacks/${payback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '금액 저장에 실패했습니다')
        return
      }
      onSaved(body as Partial<Payback>)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="font-medium text-[#0066cc] underline decoration-dotted underline-offset-2"
      >
        {payback.amount.toLocaleString()}P
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={saving}
          className="w-24 rounded-[7px] border border-hairline px-2 py-1 text-[12px] outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-pill bg-primary px-2 py-1 text-[11px] font-medium text-ink disabled:opacity-40"
        >
          {saving ? '저장 중' : '저장'}
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-[11px] text-muted-light">
          취소
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}

function updatePaybackInList(prev: Payback[], id: string, patch: Partial<Payback>): Payback[] {
  return prev.map(p => (p.id === id ? { ...p, ...patch } : p))
}

function PaybackItemRow({
  payback,
  advertiserCell,
  onAmountSaved,
  onUpdate,
}: {
  payback: Payback
  advertiserCell: { advertiserName: string; period: string; rowSpan: number } | null
  onAmountSaved: (patch: Partial<Payback>) => void
  onUpdate: (patch: { scheduled_pay_date?: string; status?: PaybackStatus }) => void
}) {
  return (
    <tr className="hover:bg-[#f5f5f7] transition-colors align-top">
      {advertiserCell && (
        <>
          <td rowSpan={advertiserCell.rowSpan} className="px-4 py-3 text-[#1d1d1f] font-medium border-r border-[#f0f0f2] align-top">
            {advertiserCell.advertiserName}
          </td>
          <td rowSpan={advertiserCell.rowSpan} className="px-4 py-3 text-[#1d1d1f] align-top">
            {advertiserCell.period}
          </td>
        </>
      )}
      <td className="px-4 py-3 text-[#1d1d1f]">{payback.ad_accounts?.account_name}</td>
      <td className="px-4 py-3"><CostBasisBadge payback={payback} /></td>
      <td className="px-4 py-3">
        <AmountEditor payback={payback} onSaved={onAmountSaved} />
      </td>
      <td className="px-4 py-3">
        <input
          type="date"
          defaultValue={payback.scheduled_pay_date ?? ''}
          onBlur={e => e.target.value && onUpdate({ scheduled_pay_date: e.target.value })}
          className="rounded-[7px] border border-[#e0e0e0] px-2 py-1 text-[12px] outline-none focus:border-[#0066cc]"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={payback.status}
          onChange={e => onUpdate({ status: e.target.value as PaybackStatus })}
          className="rounded-[7px] border border-[#e0e0e0] px-2 py-1 text-[12px] outline-none focus:border-[#0066cc]"
        >
          {PAYBACK_STATUSES.map(s => <option key={s} value={s}>{PAYBACK_STATUS_LABEL[s]}</option>)}
        </select>
      </td>
      <td className="px-4 py-3"><AuditTrail payback={payback} /></td>
      <td className="px-4 py-3">
        <a
          href={`/api/paybacks/statement?period=${payback.period}&user_id=${payback.user_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-[#0066cc] hover:underline"
        >
          보기
        </a>
      </td>
    </tr>
  )
}

function AdvertiserSubtotalRow({ group }: { group: AdvertiserPeriodGroup }) {
  return (
    <tr className="bg-[#f5f5f7] font-medium">
      <td colSpan={2} className="px-4 py-2 text-[12px] text-[#6e6e73]">{group.advertiserName} · {group.period} 정산 합계 ({group.items.length}건)</td>
      <td className="px-4 py-2 text-[13px] text-[#0066cc]">{group.total.toLocaleString()}P</td>
      <td className="px-4 py-2" />
      <td className="px-4 py-2" />
      <td className="px-4 py-2" />
      <td className="px-4 py-2">
        <a
          href={`/api/paybacks/statement?period=${group.period}&user_id=${group.userId}`}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] text-[#0066cc] hover:underline"
        >
          정산서
        </a>
      </td>
    </tr>
  )
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
      const body = await res.json() as { created?: number; alreadyGenerated?: number; missingSpend?: number; error?: string }
      if (res.ok) {
        const missingNote = body.missingSpend ? ` · 실 소진액 미입력 ${body.missingSpend}건은 건너뜀(광고 계정 이력 관리에서 입력 필요)` : ''
        showToast(`정산 ${body.created}건 생성 · 이미 생성됨 ${body.alreadyGenerated}건${missingNote}`)
        load()
      } else {
        showToast(body.error ?? '정산 생성에 실패했습니다')
      }
    } finally {
      setGenerating(false)
    }
  }

  async function updateRecord(id: string, patch: { scheduled_pay_date?: string; status?: PaybackStatus }) {
    const res = await fetch(`/api/paybacks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const body = await res.json()
    if (res.ok) {
      setPaybacks(prev => updatePaybackInList(prev, id, body as Partial<Payback>))
    } else {
      showToast(body.error ?? '정산 내역 수정에 실패했습니다')
    }
  }

  function handleAmountSaved(id: string, patch: Partial<Payback>) {
    setPaybacks(prev => updatePaybackInList(prev, id, patch))
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
        <p className="text-[13px] text-[#6e6e73] mb-4">영업권 이관이 완료된(연동 완료) 계정 중 어드민이 광고 계정 &gt; 이력 관리에서 그 달 실 소진액을 입력한 계정만 대상입니다. 사장님이 등록 시 제출한 값으로는 정산이 생성되지 않습니다. 이미 생성된 계정은 건너뜁니다.</p>
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
          <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f5f5f7] border-b border-[#e0e0e0]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">광고주</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">기간</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">계정</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">기준</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">금액</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">지급 예정일</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">상태</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">검토 이력</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e73]">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {groupByAdvertiserPeriod(paybacks).flatMap(group => {
                const showSubtotal = group.items.length > 1
                const rowSpan = group.items.length + (showSubtotal ? 1 : 0)
                const rows = group.items.map((p, idx) => (
                  <PaybackItemRow
                    key={p.id}
                    payback={p}
                    advertiserCell={idx === 0 ? { advertiserName: group.advertiserName, period: group.period, rowSpan } : null}
                    onAmountSaved={patch => handleAmountSaved(p.id, patch)}
                    onUpdate={patch => updateRecord(p.id, patch)}
                  />
                ))
                if (showSubtotal) rows.push(<AdvertiserSubtotalRow key={`${group.key}-subtotal`} group={group} />)
                return rows
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
