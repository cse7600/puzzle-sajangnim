'use client'
import { useMemo, useState } from 'react'
import {
  Platform,
  PaybackStatus,
  CostBasis,
  PLATFORM_INFO,
  PAYBACK_STATUSES,
  PAYBACK_USER_STATUS_LABEL,
  COST_BASIS_LABEL,
} from '@/lib/hub'

export interface PaybackLineItem {
  id: string
  amount: number
  period: string
  status: PaybackStatus
  cost_basis: CostBasis
  scheduled_pay_date: string | null
  spend_basis_amount: number
  withdrawal_deadline: string | null
  withdrawal: { id: string; status: string } | null
  ad_accounts: {
    platform: Platform
    account_name: string
    payback_rate: number
  }
}

const WITHDRAWAL_STATUS_TEXT: Record<string, string> = {
  requested: '출금 신청 접수됨',
  processing: '출금 지급 처리중',
  paid: '출금 지급완료',
  rejected: '출금 신청 반려됨 — 재신청 가능',
}

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function WithdrawalAction({ payback, onRequested }: { payback: PaybackLineItem; onRequested: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (payback.status !== 'confirmed') return null

  if (payback.withdrawal && payback.withdrawal.status !== 'rejected') {
    return <p className="mt-1 text-[11px] text-[#6e6e73]">{WITHDRAWAL_STATUS_TEXT[payback.withdrawal.status]}</p>
  }

  async function requestWithdrawal() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payback_id: payback.id }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? '출금 신청에 실패했습니다')
        return
      }
      onRequested()
    } finally {
      setSubmitting(false)
    }
  }

  const remainingDays = payback.withdrawal_deadline ? daysUntil(payback.withdrawal_deadline) : null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={requestWithdrawal}
        disabled={submitting}
        className="rounded-[9999px] border border-primary-dark px-2.5 py-1 text-[11px] font-medium text-primary-dark hover:bg-accent-bg disabled:opacity-50 transition-colors"
      >
        {submitting ? '신청 중...' : '출금 신청'}
      </button>
      {remainingDays !== null && (
        <span className="ml-1.5 text-[11px] text-[#a1a1a6]">
          {remainingDays > 0 ? `D-${remainingDays} 내 미신청 시 포인트 전환` : '기한 만료 — 곧 포인트 전환됩니다'}
        </span>
      )}
      {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}

interface MonthGroup {
  period: string
  rows: PaybackLineItem[]
  totalAmount: number
  scheduledPayDate: string | null
  status: PaybackStatus
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  처리중: 'text-amber-600 bg-amber-50 border-amber-200',
  '확정 — 출금 신청 가능': 'text-green-600 bg-green-50 border-green-200',
  지급완료: 'text-[#6e6e73] bg-[#f5f5f7] border-[#e0e0e0]',
  '포인트 전환 완료': 'text-violet-600 bg-violet-50 border-violet-200',
}

// 한 달 안에 여러 광고계정 라인아이템의 상태가 섞일 수 있다(예: 계정 A는 confirmed, 계정 B는 draft).
// 이때 월 헤더 상태는 "가장 덜 진행된 단계"를 따른다 — 아직 한 건이라도 처리중이면
// 사용자에게 그 달 정산이 전부 확정/지급된 것처럼 보이면 안 되기 때문.
function leastAdvancedStatus(rows: PaybackLineItem[]): PaybackStatus {
  return rows.reduce((worst, row) => {
    return PAYBACK_STATUSES.indexOf(row.status) < PAYBACK_STATUSES.indexOf(worst) ? row.status : worst
  }, rows[0].status)
}

function groupByPeriod(paybacks: PaybackLineItem[]): MonthGroup[] {
  const byPeriod = new Map<string, PaybackLineItem[]>()
  for (const row of paybacks) {
    const list = byPeriod.get(row.period) ?? []
    list.push(row)
    byPeriod.set(row.period, list)
  }
  return Array.from(byPeriod.entries())
    .map(([period, rows]) => ({
      period,
      rows,
      totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
      scheduledPayDate: rows[0].scheduled_pay_date,
      status: leastAdvancedStatus(rows),
    }))
    .sort((a, b) => b.period.localeCompare(a.period))
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-')
  return `${year}년 ${Number(month)}월`
}

async function downloadStatement(period: string): Promise<{ error?: string }> {
  let res: Response
  try {
    res = await fetch(`/api/paybacks/statement?period=${period}`)
  } catch {
    return { error: '네트워크 오류로 정산내역서를 내려받지 못했습니다' }
  }
  if (!res.ok) {
    let message = '정산내역서 PDF를 내려받지 못했습니다'
    try {
      const body = await res.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      // JSON이 아닌 응답(예: 500 HTML 에러 페이지)일 수 있으므로 기본 메시지를 유지한다.
    }
    return { error: message }
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${period}-정산내역서.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return {}
}

function LineItemRow({ row, onWithdrawalRequested }: { row: PaybackLineItem; onWithdrawalRequested: () => void }) {
  const platformInfo = PLATFORM_INFO[row.ad_accounts.platform] ?? {
    name: row.ad_accounts.platform,
    color: '#6e6e73',
  }
  const statusLabel = PAYBACK_USER_STATUS_LABEL[row.status]

  return (
    <tr className="border-t border-[#e0e0e0]">
      <td className="px-5 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: platformInfo.color }} />
          <span className="text-[#1d1d1f]">{platformInfo.name}</span>
        </span>
      </td>
      <td className="px-3 py-3 text-[#1d1d1f] whitespace-nowrap">{row.ad_accounts.account_name}</td>
      <td className="px-3 py-3 text-right text-[#1d1d1f] whitespace-nowrap">
        {row.spend_basis_amount.toLocaleString()}원
        <span className="ml-1 text-[11px] text-[#a1a1a6]">{COST_BASIS_LABEL[row.cost_basis]}</span>
      </td>
      <td className="px-3 py-3 text-right text-[#6e6e73] whitespace-nowrap">{row.ad_accounts.payback_rate}%</td>
      <td className="px-3 py-3 text-right font-medium text-primary-dark whitespace-nowrap">
        +{row.amount.toLocaleString()}P
      </td>
      <td className="px-5 py-3 text-right whitespace-nowrap">
        <span className={`rounded-[9999px] border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[statusLabel]}`}>
          {statusLabel}
        </span>
        <WithdrawalAction payback={row} onRequested={onWithdrawalRequested} />
      </td>
    </tr>
  )
}

function MonthTable({
  group,
  downloading,
  error,
  onDownload,
  onWithdrawalRequested,
  showPdfDownload,
}: {
  group: MonthGroup
  downloading: boolean
  error: string | null
  onDownload: () => void
  onWithdrawalRequested: () => void
  showPdfDownload: boolean
}) {
  const headerLabel = PAYBACK_USER_STATUS_LABEL[group.status]

  return (
    <div className="rounded-[14px] border border-[#e0e0e0] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f5f7] px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold text-[#1d1d1f]">{formatPeriodLabel(group.period)}</p>
          <p className="text-[12px] text-[#6e6e73] mt-0.5">지급 예정일 {group.scheduledPayDate ?? '미정'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-[9999px] border px-2.5 py-1 text-[11px] font-medium ${STATUS_BADGE_CLASS[headerLabel]}`}>
            {headerLabel}
          </span>
          <p className="text-[16px] font-semibold text-primary-dark">+{group.totalAmount.toLocaleString()}P</p>
          {showPdfDownload && (
            <button
              onClick={onDownload}
              disabled={downloading}
              className="rounded-[9999px] border border-[#e0e0e0] px-3.5 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-white disabled:opacity-50 transition-colors"
            >
              {downloading ? 'PDF 생성 중...' : 'PDF 다운로드'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-2 text-[12px] text-red-600 bg-red-50 border-t border-red-100">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-t border-[#e0e0e0] text-left text-[12px] text-[#6e6e73]">
              <th className="px-5 py-2 font-medium">플랫폼</th>
              <th className="px-3 py-2 font-medium">계정명</th>
              <th className="px-3 py-2 font-medium text-right">광고비</th>
              <th className="px-3 py-2 font-medium text-right">페이백율</th>
              <th className="px-3 py-2 font-medium text-right">금액</th>
              <th className="px-5 py-2 font-medium text-right">상태</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map(row => <LineItemRow key={row.id} row={row} onWithdrawalRequested={onWithdrawalRequested} />)}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#e0e0e0] font-semibold">
              <td className="px-5 py-3" colSpan={4}>소계</td>
              <td className="px-3 py-3 text-right text-primary-dark whitespace-nowrap">
                +{group.totalAmount.toLocaleString()}P
              </td>
              <td className="px-5 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function SettlementTable({
  paybacks,
  onWithdrawalRequested,
  showPdfDownload = true,
}: {
  paybacks: PaybackLineItem[]
  onWithdrawalRequested?: () => void
  showPdfDownload?: boolean
}) {
  const groups = useMemo(() => groupByPeriod(paybacks), [paybacks])
  const periodOptions = useMemo(() => groups.map(g => g.period), [groups])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [downloadingPeriod, setDownloadingPeriod] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<{ period: string; message: string } | null>(null)

  const visibleGroups = selectedPeriod === 'all' ? groups : groups.filter(g => g.period === selectedPeriod)

  async function handleDownload(period: string) {
    setDownloadingPeriod(period)
    setDownloadError(null)
    const result = await downloadStatement(period)
    if (result.error) setDownloadError({ period, message: result.error })
    setDownloadingPeriod(null)
  }

  if (paybacks.length === 0) {
    return (
      <div className="text-center py-12 text-[#6e6e73]">
        <p className="text-[15px]">아직 발행된 정산 내역이 없습니다</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="settlement-period" className="text-[13px] text-[#6e6e73]">정산 월</label>
        <select
          id="settlement-period"
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="rounded-[9999px] border border-[#e0e0e0] px-3 py-1.5 text-[13px] text-[#1d1d1f] outline-none focus:border-primary-dark transition-colors"
        >
          <option value="all">전체</option>
          {periodOptions.map(period => (
            <option key={period} value={period}>{formatPeriodLabel(period)}</option>
          ))}
        </select>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="text-center py-12 text-[#6e6e73]">
          <p className="text-[15px]">{formatPeriodLabel(selectedPeriod)} 정산 내역 없음</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map(group => (
            <MonthTable
              key={group.period}
              group={group}
              downloading={downloadingPeriod === group.period}
              error={downloadError?.period === group.period ? downloadError.message : null}
              onDownload={() => handleDownload(group.period)}
              onWithdrawalRequested={() => onWithdrawalRequested?.()}
              showPdfDownload={showPdfDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
